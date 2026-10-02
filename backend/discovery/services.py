"""Privacy-first, bounded retrieval and deterministic evidence-based ranking."""
import re
from datetime import timedelta
from django.db import connection
from django.db.models import F, Prefetch, Q
from django.utils import timezone
from interactions.models import Endorsement, Review
from profiles.models import ProfileSkill, StudentProfile
from profiles.policy import visible_feedback, visible_profiles
from taxonomy.models import SkillTag
from .models import ProfileSearchIndex

CANDIDATE_LIMIT = 200
STOPWORDS = {'i', 'a', 'an', 'the', 'to', 'for', 'with', 'my', 'me', 'help', 'need', 'want', 'someone', 'can', 'you', 'and', 'on', 'in', 'of', 'how', 'who', 'should', 'get', 'please', 'looking'}

class RankedList(list):
    def __init__(self, rows=(), metadata=None):
        super().__init__(rows)
        self.metadata = metadata or {}


def build_profile_search_text(profile):
    # Only published skill evidence: no contacts, goals, demographics or link scraping.
    skills = list(profile.profile_skills.select_related('skill'))
    return ' '.join([profile.headline, profile.bio] + [f'{ps.skill.name} {ps.description}' for ps in skills]).strip()


def base_discoverable_queryset(queryset, user=None):
    return visible_profiles(queryset, user).filter(open_to_connect=True)


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


def matching_skills(query):
    raw = query.casefold()
    result = {}
    for tag in SkillTag.objects.filter(is_approved=True).only('id', 'name', 'slug', 'aliases'):
        terms = [tag.name, tag.slug.replace('-', ' ')] + tag.aliases
        if any(re.search(r'(?<!\w)' + re.escape(term.casefold()) + r'(?!\w)', raw) for term in terms if isinstance(term, str) and term):
            result[tag.pk] = tag.name
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
        indexes = ProfileSearchIndex.objects.filter(profile__in=queryset).annotate(vector=SearchVector('search_text', config='english'), relevance=SearchRank(SearchVector('search_text', config='english'), search)).filter(vector=search).order_by('-relevance', 'profile_id')
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
    matched = matching_skills(query)
    ids, text_scores, limited = retrieve_candidates(queryset, query, matched)
    # Semantic retrieval is independent; its IDs were selected after privacy/filter checks.
    semantic_scores = semantic_scores or {}
    ids = list(dict.fromkeys(ids + list(semantic_scores)))[:CANDIDATE_LIMIT]
    reviews = visible_feedback(Review.objects.all(), user) if user else Review.objects.none()
    endorsements = visible_feedback(Endorsement.objects.all(), user, 'endorser') if user else Endorsement.objects.none()
    profiles = queryset.filter(pk__in=ids).select_related('user').prefetch_related(
        Prefetch('profile_skills', queryset=ProfileSkill.objects.filter(skill__is_approved=True).select_related('skill__category'), to_attr='offered_skills'),
        'availability', 'credentials', Prefetch('reviews', queryset=reviews, to_attr='verified_reviews'),
        Prefetch('endorsements', queryset=endorsements, to_attr='verified_endorsements'))
    ranked = []
    now = timezone.now()
    explicit = {item.strip().casefold() for item in ','.join([params.get('skill', ''), params.get('skills', '')]).split(',') if item.strip()}
    for profile in profiles:
        offered = profile.offered_skills
        hits = [ps for ps in offered if ps.skill_id in matched]
        skill_relevance = min(len(hits)/max(len(matched), 1), 1) if query else .5
        text = build_profile_search_text_cached(profile).casefold()
        tokens = [word for word in re.findall(r'[\w+#.]+', query.casefold()) if word not in STOPWORDS][:30]
        lexical = text_scores.get(profile.pk, sum(word in text for word in tokens)/max(len(tokens), 1)) if query else .5
        semantic = semantic_scores.get(profile.pk)
        relevance = .6*skill_relevance + .25*(semantic or 0) + .15*lexical if semantic_scores else .8*skill_relevance + .2*lexical
        availability = list(profile.availability.all())
        availability_fit = 1 if params.get('availability_day') or params.get('availability_time') else .5
        ratings = [row.rating for row in profile.verified_reviews]
        reliability = (sum(ratings)/5 + 2.5)/(len(ratings)+5)  # Five neutral prior observations.
        recently_confirmed = bool(profile.availability_confirmed_at and profile.availability_confirmed_at >= now-timedelta(days=30))
        score = .75*relevance + .10*availability_fit + .10*reliability + .05*recently_confirmed
        reasons = [f'Offers {ps.skill.name} help.' for ps in hits[:3]]
        if not reasons and semantic is not None:
            reasons.append('Published skill text is related to your search.')
        if not reasons and lexical > 0:
            reasons.append('Published profile text mentions your search terms.')
        for window in availability[:1]:
            reasons.append(f'Available {window.day_of_week.title()} {window.time_block}.')
        if ratings:
            reasons.append(f'Feedback from {len(ratings)} completed request(s).')
        if not query:
            reasons = ['Willing to help.'] + reasons
        profile.match_score = round(score*100, 2)  # Internal ordering value, never confidence.
        profile.match_reasons = reasons[:5]
        profile.semantic_reasons = []
        profile.average_rating = sum(ratings)/len(ratings) if ratings else None
        profile.review_count = len(ratings)
        profile.endorsement_count = len(profile.verified_endorsements)
        profile.has_resume = any(c.credential_type == 'resume' and c.visibility == 'public' for c in profile.credentials.all())
        profile.availability_summary = ', '.join(f'{w.day_of_week} {w.time_block}' for w in availability[:2])
        exact_priority = bool(hits) or bool(explicit and any(ps.skill.name.casefold() in explicit or ps.skill.slug.casefold() in explicit for ps in offered))
        profile._exact_priority = exact_priority
        ranked.append((score, profile))
    ordering = params.get('ordering', 'best_match')
    if ordering == 'display_name':
        ranked.sort(key=lambda row: row[1].display_name.casefold())
    elif ordering == 'highest_rated':
        ranked.sort(key=lambda row: (row[1].average_rating or 2.5, row[0], -row[1].pk), reverse=True)
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
    return RankedList(ranked, {'mode': 'hybrid' if semantic_scores else 'keyword_taxonomy', 'candidate_limit': CANDIDATE_LIMIT, 'bounded': limited, 'fallback_reason': 'paid_calls_disabled'})


def build_profile_search_text_cached(profile):
    return ' '.join([profile.headline, profile.bio]+[f'{ps.skill.name} {ps.description}' for ps in profile.offered_skills])


def semantic_rank_profiles(queryset, query='', params=None, user=None):
    # The gated provider adapter is introduced separately; this fallback is truthful.
    return rank_profiles(queryset, query, params, user=user)


def recommend_profiles_for_user(user, queryset):
    profile = getattr(user, 'profile', None)
    goals = list(profile.learning_goals.filter(is_approved=True).values_list('name', flat=True)) if profile else []
    query = ' '.join(goals + ([profile.learning_goal_notes] if goals and profile.learning_goal_notes else []))
    ranked = rank_profiles(queryset.exclude(user=user), query, user=user)
    ranked.metadata['recommendation_basis'] = 'learning_goals' if goals else 'discovery_suggestions'
    return ranked


def similar_profiles_for(profile, queryset, user=None):
    query = ' '.join(profile.profile_skills.values_list('skill__name', flat=True))
    return rank_profiles(queryset.exclude(pk=profile.pk), query, user=user)


def rebuild_profile_search_index(profile):
    if profile.visibility != 'public' or not profile.user.is_active or not profile.user.is_student_verified or profile.user.is_demo:
        ProfileSearchIndex.objects.filter(profile=profile).delete()
        return None
    text = build_profile_search_text(profile)
    index, _ = ProfileSearchIndex.objects.update_or_create(profile=profile, defaults={'search_text': text, 'extracted_keywords': [], 'suggested_skill_names': list(profile.profile_skills.values_list('skill__name', flat=True))})
    return index


def rebuild_all_profile_search_indexes():
    for profile in StudentProfile.objects.select_related('user').all():
        rebuild_profile_search_index(profile)
