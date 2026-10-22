"""Privacy-first, bounded retrieval and deterministic evidence-based ranking."""
import re
from difflib import get_close_matches
from datetime import timedelta
from django.db import connection
from django.db.models import Count, F, Prefetch, Q
from django.utils import timezone
from interactions.models import Endorsement, HelpRequest, Review
from profiles.models import Availability, ProfileSkill, StudentProfile
from profiles.policy import visible_feedback, visible_profiles
from taxonomy.models import SkillTag
from .models import ProfileSearchIndex

CANDIDATE_LIMIT = 200
STOPWORDS = {'i', 'a', 'an', 'the', 'to', 'for', 'with', 'my', 'me', 'help', 'need', 'want', 'someone', 'can', 'you', 'and', 'on', 'in', 'of', 'how', 'who', 'should', 'get', 'please', 'looking'}

LEVEL_WEIGHT = {'advanced': 1.0, 'intermediate': .6, 'beginner': .3}
HISTORY_WINDOW = timedelta(days=180)
BUSY_WAITING = 3  # Requests already waiting on a helper before new ones are steered elsewhere.


def plural(count, word):
    return f"{count} {word}{'' if count == 1 else 's'}"


def reliability_score(ratings_by_reviewer):
    """Average rating with a neutral prior of five 3-star reviews; each reviewer counts once."""
    means = [sum(rows)/len(rows) for rows in ratings_by_reviewer.values()]
    return (sum(means)/5 + 3)/(len(means) + 5)


def responsiveness_score(history):
    """Share of recent incoming requests answered rather than left to expire, with a neutral prior."""
    answered, expired = history.get('answered', 0), history.get('expired', 0)
    return (answered + 1.5)/(answered + expired + 2)


def request_history(profile_ids):
    since = timezone.now() - HISTORY_WINDOW
    rows = (HelpRequest.objects.filter(helper_profile_id__in=profile_ids).values('helper_profile_id').annotate(
        answered=Count('pk', filter=Q(created_at__gte=since) & (Q(accepted_at__isnull=False) | Q(declined_at__isnull=False))),
        expired=Count('pk', filter=Q(created_at__gte=since, status=HelpRequest.Status.EXPIRED)),
        waiting=Count('pk', filter=Q(status=HelpRequest.Status.PENDING)),
    ))
    return {row['helper_profile_id']: row for row in rows}


def shared_times(mine, theirs):
    """Their weekly slots that overlap mine; 'flexible' matches any day or time."""
    def fits(a, b):
        return a == b or 'flexible' in (a, b)
    return [slot for slot in theirs if any(fits(slot.day_of_week, day) and fits(slot.time_block, block) for day, block in mine)]


def viewer_slots(user):
    if not user or not user.is_authenticated:
        return set()
    return set(Availability.objects.filter(profile__user=user).values_list('day_of_week', 'time_block'))


class RankedList(list):
    def __init__(self, rows=(), metadata=None):
        super().__init__(rows)
        self.metadata = metadata or {}


def build_profile_search_text(profile):
    # Only published skill evidence: no contacts, goals, demographics or link scraping.
    skills = list(profile.profile_skills.select_related('skill'))
    return ' '.join([profile.headline, profile.bio] + [f'{ps.skill.name} {ps.description}' for ps in skills]).strip()


def base_discoverable_queryset(queryset, user=None):
    return visible_profiles(queryset, user).filter(open_to_connect=True).exclude(user=user)


def apply_discovery_filters(queryset, params, user=None):
    queryset = base_discoverable_queryset(queryset, user)
    if str(params.get('open_to_connect', '')).lower() in {'false', '0', 'no'}:
        return queryset.none()
    for field in ['major', 'year']:
        if params.get(field):
            queryset = queryset.filter(**{field: params[field]})
    for field, target in [('availability_day', 'availability__day_of_week'), ('availability_time', 'availability__time_block')]:
        if params.get(field):
            queryset = queryset.filter(**{target: params[field]})
    for category in filter(None, ','.join([params.get('category', ''), params.get('categories', '')]).split(',')):
        queryset = queryset.filter(Q(profile_skills__skill__category__slug__iexact=category.strip()) | Q(profile_skills__skill__category__name__iexact=category.strip()), profile_skills__skill__is_approved=True)
    for skill in filter(None, ','.join([params.get('skill', ''), params.get('skills', '')]).split(',')):
        queryset = queryset.filter(Q(profile_skills__skill__slug__iexact=skill.strip()) | Q(profile_skills__skill__name__iexact=skill.strip()), profile_skills__skill__is_approved=True)
    if params.get('contact_method'):
        queryset = queryset.filter(preferred_contact_method=params['contact_method'])  # Never inspect hidden contacts.
    if str(params.get('has_credentials', '')).lower() in {'true', '1', 'yes'}:
        queryset = queryset.filter(credentials__visibility='public')
    return queryset.distinct()


def matching_skills(query, corrections=None):
    """Approved skills named in the query. Misspelled words close to a skill name or alias also
    match, and are reported in `corrections` (for example "pyhton" -> Python)."""
    raw = query.casefold()
    result, vocabulary = {}, {}
    for tag in SkillTag.objects.filter(is_approved=True).only('id', 'name', 'slug', 'aliases'):
        terms = [term.casefold() for term in [tag.name, tag.slug.replace('-', ' ')] + tag.aliases if isinstance(term, str) and term]
        if any(re.search(r'(?<!\w)' + re.escape(term) + r'(?!\w)', raw) for term in terms):
            result[tag.pk] = tag.name
        for term in terms:
            vocabulary.setdefault(term, tag)
    words = [word for word in re.findall(r'[\w+#.]+', raw) if word not in STOPWORDS]
    known = {word for term in vocabulary for word in term.split()}
    if result:
        return result  # The query already names a skill, so nearby ordinary words ("reach") aren't rewritten.
    candidates = [word for word in words if len(word) >= 4 and word not in known]
    candidates += [f'{first} {second}' for first, second in zip(words, words[1:]) if first not in known or second not in known]
    for phrase in candidates:
        close = get_close_matches(phrase, list(vocabulary), n=1, cutoff=.8)
        if close and vocabulary[close[0]].pk not in result:
            tag = vocabulary[close[0]]
            result[tag.pk] = tag.name
            if corrections is not None:
                corrections.append(tag.name)
    return result


def retrieve_candidates(queryset, query, matched):
    ids, full_text_scores = [], {}
    limited = False
    if not query.strip():
        rows = list(queryset.order_by(F('availability_confirmed_at').desc(nulls_last=True), 'pk').values_list('pk', flat=True)[:CANDIDATE_LIMIT+1])
        return rows[:CANDIDATE_LIMIT], {}, len(rows) > CANDIDATE_LIMIT
    exact = list(queryset.filter(profile_skills__skill_id__in=matched).order_by('pk').values_list('pk', flat=True).distinct()[:CANDIDATE_LIMIT+1]) if matched else []
    ids.extend(exact[:CANDIDATE_LIMIT]); limited |= len(exact) > CANDIDATE_LIMIT
    tokens = [word for word in re.findall(r'[\w+#.]+', query.casefold()) if word not in STOPWORDS][:30]
    if tokens and connection.vendor == 'postgresql':
        from django.contrib.postgres.search import SearchQuery, SearchRank, SearchVector
        search = SearchQuery(tokens[0], config='english')
        for token in tokens[1:]:
            search |= SearchQuery(token, config='english')
        indexes = ProfileSearchIndex.objects.filter(profile__in=queryset).annotate(keyword_vector=SearchVector('search_text', config='english'), relevance=SearchRank(SearchVector('search_text', config='english'), search)).filter(keyword_vector=search).order_by('-relevance', 'profile_id')
        rows = list(indexes.values_list('profile_id', 'relevance')[:CANDIDATE_LIMIT+1])
        for pk, relevance in rows[:CANDIDATE_LIMIT]:
            ids.append(pk); full_text_scores[pk] = min(float(relevance)*10, 1)
        limited |= len(rows) > CANDIDATE_LIMIT
    # Keeps legacy/unindexed profiles discoverable during index rebuilding; SQL is bounded.
    conditions = Q(pk__in=[])
    for token in tokens:
        conditions |= Q(headline__icontains=token) | Q(bio__icontains=token) | Q(profile_skills__description__icontains=token) | Q(profile_skills__skill__name__icontains=token)
    rows = list(queryset.filter(conditions).order_by('pk').values_list('pk', flat=True).distinct()[:CANDIDATE_LIMIT+1])
    ids.extend(rows[:CANDIDATE_LIMIT]); limited |= len(rows) > CANDIDATE_LIMIT
    deduplicated = list(dict.fromkeys(ids))
    limited |= len(deduplicated) > CANDIDATE_LIMIT
    return deduplicated[:CANDIDATE_LIMIT], full_text_scores, limited


def rank_profiles(queryset, query='', params=None, user=None, semantic_scores=None):
    params = params or {}
    corrections = []
    matched = matching_skills(query, corrections)
    ids, text_scores, limited = retrieve_candidates(queryset, query, matched)
    # Semantic retrieval is independent; its IDs were selected after privacy/filter checks.
    semantic_scores = semantic_scores or {}
    from itertools import zip_longest
    combined = [pk for pair in zip_longest(ids, list(semantic_scores)) for pk in pair if pk is not None]
    unique = list(dict.fromkeys(combined))
    limited |= len(unique) > CANDIDATE_LIMIT
    ids = unique[:CANDIDATE_LIMIT]
    reviews = visible_feedback(Review.objects.all(), user) if user else Review.objects.none()
    endorsements = visible_feedback(Endorsement.objects.all(), user, 'endorser') if user else Endorsement.objects.none()
    profiles = queryset.filter(pk__in=ids).select_related('user').prefetch_related(
        Prefetch('profile_skills', queryset=ProfileSkill.objects.filter(skill__is_approved=True).select_related('skill__category'), to_attr='offered_skills'),
        'availability', 'credentials', Prefetch('reviews', queryset=reviews, to_attr='verified_reviews'),
        Prefetch('endorsements', queryset=endorsements, to_attr='verified_endorsements'))
    ranked = []
    now = timezone.now()
    history = request_history(ids)
    mine = viewer_slots(user)
    explicit = {item.strip().casefold() for item in ','.join([params.get('skill', ''), params.get('skills', '')]).split(',') if item.strip()}
    tokens = [word for word in re.findall(r'[\w+#.]+', query.casefold()) if word not in STOPWORDS][:30]
    for profile in profiles:
        offered = profile.offered_skills
        hits = [ps for ps in offered if ps.skill_id in matched]
        skill_relevance = min(len(hits)/max(len(matched), 1), 1) if query else .5
        text = build_profile_search_text_cached(profile).casefold()
        lexical = text_scores.get(profile.pk, sum(word in text for word in tokens)/max(len(tokens), 1)) if query else .5
        semantic = semantic_scores.get(profile.pk)
        relevance = .6*skill_relevance + .25*(semantic or 0) + .15*lexical if semantic_scores else .8*skill_relevance + .2*lexical
        # Skill trust: distinct members who endorsed or reviewed them for the skills being searched.
        trust_skills = {ps.skill_id for ps in hits} if hits else {ps.skill_id for ps in offered}
        backers = {e.endorser_id for e in profile.verified_endorsements if e.skill_id in trust_skills}
        backers |= {r.reviewer_id for r in profile.verified_reviews if r.related_skill_id in trust_skills}
        skill_trust = len(backers)/(len(backers) + 3)
        by_reviewer = {}
        for review in profile.verified_reviews:
            by_reviewer.setdefault(review.reviewer_id, []).append(review.rating)
        reliability = reliability_score(by_reviewer)
        record = history.get(profile.pk, {})
        responsiveness = responsiveness_score(record)
        availability = list(profile.availability.all())
        overlap = shared_times(mine, availability) if mine else []
        if params.get('availability_day') or params.get('availability_time'):
            availability_fit = 1
        elif mine and availability:
            availability_fit = 1 if overlap else .25
        else:
            availability_fit = .5
        level = max((LEVEL_WEIGHT.get(ps.confidence_level, .5) for ps in hits), default=.5)
        recently_confirmed = bool(profile.availability_confirmed_at and profile.availability_confirmed_at >= now-timedelta(days=30))
        score = (.55*relevance + .12*skill_trust + .10*availability_fit + .08*reliability + .08*responsiveness
                 + .04*level + .03*recently_confirmed)
        if record.get('waiting', 0) >= BUSY_WAITING:
            score -= .05  # Spread new requests away from helpers who already have a queue.
        reasons = [f'Offers {ps.skill.name} help.' for ps in hits[:3]]
        if not reasons and semantic is not None:
            reasons.append('Published skill text is related to your search.')
        if not reasons and lexical > 0:
            reasons.append('Published profile text mentions your search terms.')
        endorsers = {e.endorser_id for e in profile.verified_endorsements if e.skill_id in trust_skills}
        if endorsers:
            subject = f' for {hits[0].skill.name}' if hits else ''
            reasons.append(f'Endorsed{subject} by {plural(len(endorsers), "member")}.')
        if overlap:
            reasons.append(f"You're both free {overlap[0].day_of_week.title()} {overlap[0].time_block}.")
        else:
            for window in availability[:1]:
                reasons.append(f'Available {window.day_of_week.title()} {window.time_block}.')
        asked = record.get('answered', 0) + record.get('expired', 0)
        if asked >= 3:
            reasons.append(f"Answered {record.get('answered', 0)} of {asked} recent requests.")
        ratings = [row.rating for row in profile.verified_reviews]
        if by_reviewer:
            reasons.append(f'Feedback from {plural(len(by_reviewer), "member")}.')
        if not query:
            reasons = ['Willing to help.'] + reasons
        profile.match_score = round(score*100, 2)  # Internal ordering value, never confidence.
        profile.match_reasons = reasons[:5]
        profile.semantic_reasons = []
        profile.average_rating = sum(ratings)/len(ratings) if ratings else None
        profile.review_count = len(ratings)
        profile.endorsement_count = len(profile.verified_endorsements)
        profile.reliability = reliability
        profile.has_resume = any(c.credential_type == 'resume' and c.visibility == 'public' for c in profile.credentials.all())
        profile.availability_summary = ', '.join(f'{w.day_of_week} {w.time_block}' for w in availability[:2])
        exact_priority = bool(hits) or bool(explicit and any(ps.skill.name.casefold() in explicit or ps.skill.slug.casefold() in explicit for ps in offered))
        profile._exact_priority = exact_priority
        ranked.append((score, profile))
    ordering = params.get('ordering', 'best_match')
    if ordering == 'display_name':
        ranked.sort(key=lambda row: row[1].display_name.casefold())
    elif ordering == 'highest_rated':
        # Prior-weighted, one vote per reviewer, so a single 5-star review can't top the list.
        ranked.sort(key=lambda row: (row[1].reliability, row[0], -row[1].pk), reverse=True)
    elif ordering == 'most_endorsed':
        ranked.sort(key=lambda row: (row[1].endorsement_count, row[0], -row[1].pk), reverse=True)
    elif ordering == 'recently_active':
        ranked.sort(key=lambda row: (row[1].availability_confirmed_at or row[1].created_at, -row[1].pk), reverse=True)
    elif ordering == 'newest_profiles':
        ranked.sort(key=lambda row: (row[1].created_at, -row[1].pk), reverse=True)
    elif ordering == 'most_available':
        ranked.sort(key=lambda row: (len(row[1].availability.all()), row[0], -row[1].pk), reverse=True)
    else:
        ranked.sort(key=lambda row: (row[1]._exact_priority, row[0], -row[1].pk), reverse=True)
    return RankedList(ranked, {'mode': 'hybrid' if semantic_scores else 'keyword_taxonomy', 'candidate_limit': CANDIDATE_LIMIT, 'bounded': limited, 'fallback_reason': 'paid_calls_disabled', 'interpreted_as': corrections})


def build_profile_search_text_cached(profile):
    return ' '.join([profile.headline, profile.bio]+[f'{ps.skill.name} {ps.description}' for ps in profile.offered_skills])


def semantic_rank_profiles(queryset, query='', params=None, user=None):
    from .semantic import semantic_candidates
    scores, reason = semantic_candidates(queryset, query)
    ranked = rank_profiles(queryset, query, params, user=user, semantic_scores=scores)
    ranked.metadata['fallback_reason'] = reason
    ranked.metadata['model'] = 'text-embedding-3-small' if scores else None
    return ranked


def recommend_profiles_for_user(user, queryset):
    profile = getattr(user, 'profile', None)
    goals = list(profile.learning_goals.filter(is_approved=True).values_list('name', flat=True)) if profile else []
    query = ' '.join(goals + ([profile.learning_goal_notes] if goals and profile.learning_goal_notes else []))
    # People you already have an open request with are in your inbox, not new suggestions.
    open_requests = HelpRequest.objects.filter(status__in=[HelpRequest.Status.PENDING, HelpRequest.Status.ACCEPTED])
    engaged = set(open_requests.filter(seeker=user).values_list('helper_profile_id', flat=True))
    engaged |= set(open_requests.filter(helper_profile__user=user).values_list('seeker__profile__id', flat=True))
    ranked = rank_profiles(queryset.exclude(user=user).exclude(pk__in=engaged), query, user=user)
    ranked.metadata['recommendation_basis'] = 'learning_goals' if goals else 'discovery_suggestions'
    return ranked


def swap_matches_for_user(user, queryset):
    """Members who teach one of my goals and publicly want to learn one of my skills."""
    from profiles.swaps import swap_summary, viewer_sets
    sets = viewer_sets(user)
    mine, goals, skills = sets
    if not mine or not goals or not skills:
        reason = 'no_profile' if not mine else 'no_learning_goals' if not goals else 'no_teaching_skills'
        return RankedList([], {'basis': 'swap', 'reason': reason})
    candidates = (
        queryset.exclude(user=user)
        .filter(learning_goals_public=True)
        .filter(profile_skills__skill_id__in=goals, profile_skills__skill__is_approved=True)
        .filter(learning_goals__in=skills, learning_goals__is_approved=True)
        .distinct()
        .select_related('user')
        .prefetch_related('availability')
    )
    my_slots = set(mine.availability.values_list('day_of_week', 'time_block'))
    pool = list(candidates.order_by('pk')[:CANDIDATE_LIMIT])
    history = request_history([p.pk for p in pool])
    ratings = {}
    for row in visible_feedback(Review.objects.filter(profile__in=pool), user).values('profile_id', 'reviewer_id', 'rating'):
        ratings.setdefault(row['profile_id'], {}).setdefault(row['reviewer_id'], []).append(row['rating'])
    ranked = []
    for profile in pool:
        summary = swap_summary(user, profile, sets)
        if not summary or not summary['is_mutual']:
            continue
        shared = len(shared_times(my_slots, profile.availability.all()))
        profile.swap_match = summary
        profile.match_reasons = (
            [f"Can teach you {', '.join(s['name'] for s in summary['they_teach_you'][:2])}."]
            + [f"Wants to learn {', '.join(s['name'] for s in summary['you_can_teach'][:2])}, which you teach."]
            + ([f"You're both free at {shared} time{'' if shared == 1 else 's'}."] if shared else [])
        )
        trust = reliability_score(ratings.get(profile.pk, {})) + responsiveness_score(history.get(profile.pk, {}))
        ranked.append(((len(summary['they_teach_you']) + len(summary['you_can_teach']), shared, trust, -profile.pk), profile))
    ranked.sort(key=lambda row: row[0], reverse=True)
    return RankedList(ranked, {'basis': 'swap', 'reason': None if ranked else 'no_mutual_matches'})


def similar_profiles_for(profile, queryset, user=None):
    query = ' '.join(profile.profile_skills.values_list('skill__name', flat=True))
    return rank_profiles(queryset.exclude(pk=profile.pk), query, user=user)


def rebuild_profile_search_index(profile):
    if profile.visibility != 'public' or not profile.user.is_active or not profile.user.is_student_verified or profile.user.is_demo:
        ProfileSearchIndex.objects.filter(profile=profile).delete()
        return None
    text = build_profile_search_text(profile)
    index, _ = ProfileSearchIndex.objects.update_or_create(profile=profile, defaults={'search_text': text, 'extracted_keywords': [], 'suggested_skill_names': list(profile.profile_skills.values_list('skill__name', flat=True))})
    from .embedding_jobs import sync_embedding_job
    sync_embedding_job(index, profile)
    return index


def rebuild_all_profile_search_indexes():
    for profile in StudentProfile.objects.select_related('user').all():
        rebuild_profile_search_index(profile)
