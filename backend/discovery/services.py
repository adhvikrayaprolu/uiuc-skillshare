from collections import Counter
from difflib import SequenceMatcher

from django.db.models import Avg, Count, Q
from django.utils import timezone

from .models import ProfileSearchIndex


SYNONYMS = {
    "cv": ["resume", "resume review"],
    "job": ["internship", "internship search", "interview"],
    "career": ["resume", "interview", "networking", "linkedin"],
    "ux": ["figma", "design", "graphic design", "portfolio"],
    "design": ["figma", "graphic design", "portfolio"],
    "startup": ["startup experience", "project collaboration", "pitch"],
    "research": ["research experience", "data analysis"],
    "coding": ["python", "java", "c++", "react", "sql", "github"],
    "git": ["github"],
    "data": ["data analysis", "sql", "python", "excel"],
    "presentation": ["public speaking"],
    "speaking": ["public speaking", "presentation"],
    "housing": ["housing advice", "apartment search"],
    "transfer": ["transfer student advice", "course planning"],
    "international": ["international student advice", "campus advice"],
}

SEMANTIC_CONCEPTS = {
    "resume_help": {
        "terms": ["resume", "cv", "application", "linkedin", "networking", "career"],
        "skills": ["Resume Review", "LinkedIn Feedback", "Networking Advice", "Internship Search"],
        "categories": ["Career"],
    },
    "interview_prep": {
        "terms": ["interview", "behavioral", "consulting", "case", "prep"],
        "skills": ["Interview Prep", "Consulting Prep"],
        "categories": ["Career"],
    },
    "react_collaboration": {
        "terms": ["react", "frontend", "web", "collaborator", "project", "github"],
        "skills": ["React", "GitHub", "Project Collaboration"],
        "categories": ["Technical", "Experience"],
    },
    "data_research": {
        "terms": ["python", "sql", "analytics", "data", "research", "lab"],
        "skills": ["Python", "SQL", "Data Analysis", "Research Experience"],
        "categories": ["Technical", "Experience"],
    },
    "design_portfolio": {
        "terms": ["figma", "design", "portfolio", "ux", "graphic"],
        "skills": ["Figma", "Graphic Design", "Portfolio Review"],
        "categories": ["Creative", "Career"],
    },
    "campus_support": {
        "terms": ["housing", "campus", "transfer", "international", "course"],
        "skills": ["Housing Advice", "Campus Advice", "Transfer Student Advice", "International Student Advice"],
        "categories": ["Campus Life", "Course"],
    },
}


def _tokens(value):
    return [token.strip().lower() for token in (value or "").replace(",", " ").split() if token.strip()]


def expanded_terms(value):
    terms = set(_tokens(value))
    raw = (value or "").lower().strip()
    if raw:
        terms.add(raw)
    for token in list(terms):
        terms.update(SYNONYMS.get(token, []))
    return [term for term in terms if term]


def build_profile_search_text(profile):
    skills = " ".join(ps.skill.name for ps in profile.profile_skills.select_related("skill"))
    categories = " ".join(ps.skill.category.name for ps in profile.profile_skills.select_related("skill__category"))
    descriptions = " ".join(ps.description for ps in profile.profile_skills.all())
    credentials = " ".join(c.title for c in profile.credentials.filter(visibility="public"))
    return " ".join(
        [profile.display_name, profile.major, profile.headline, profile.bio, profile.interests, skills, categories, descriptions, credentials]
    ).lower()


def block_filter_for_user(user):
    if not user or not user.is_authenticated:
        return Q()
    blocked_ids = list(user.blocked_users.values_list("blocked_user_id", flat=True))
    blocked_by_ids = list(user.blocked_by.values_list("blocker_id", flat=True))
    return Q(user_id__in=set(blocked_ids + blocked_by_ids))


def base_discoverable_queryset(queryset, user=None):
    queryset = queryset.filter(visibility="public").distinct()
    if user and user.is_authenticated:
        queryset = queryset.exclude(block_filter_for_user(user))
    return queryset


def apply_discovery_filters(queryset, params, user=None):
    queryset = base_discoverable_queryset(queryset, user=user)
    open_to_connect = params.get("open_to_connect")
    if open_to_connect is None:
        queryset = queryset.filter(open_to_connect=True)
    elif str(open_to_connect).lower() in {"true", "1", "yes"}:
        queryset = queryset.filter(open_to_connect=True)
    elif str(open_to_connect).lower() in {"false", "0", "no"}:
        queryset = queryset.filter(open_to_connect=False)

    if params.get("major"):
        queryset = queryset.filter(major__icontains=params["major"])
    if params.get("year"):
        queryset = queryset.filter(year=params["year"])
    if params.get("availability_day"):
        queryset = queryset.filter(availability__day_of_week=params["availability_day"])
    if params.get("availability_time"):
        queryset = queryset.filter(availability__time_block=params["availability_time"])
    if params.get("contact_method"):
        queryset = queryset.filter(contact_methods__type=params["contact_method"], contact_methods__is_public=True)
    if str(params.get("has_credentials", "")).lower() in {"true", "1", "yes"}:
        queryset = queryset.filter(credentials__visibility="public")

    categories = []
    if params.get("category"):
        categories.append(params["category"])
    if params.get("categories"):
        categories.extend([c.strip() for c in params["categories"].split(",") if c.strip()])
    for category in categories:
        queryset = queryset.filter(Q(profile_skills__skill__category__slug=category) | Q(profile_skills__skill__category__name__icontains=category))

    skill_terms = []
    if params.get("skill"):
        skill_terms.append(params["skill"])
    if params.get("skills"):
        skill_terms.extend([s.strip() for s in params["skills"].split(",") if s.strip()])
    for skill in skill_terms:
        skill_expanded = expanded_terms(skill)
        q_obj = Q()
        for term in skill_expanded:
            q_obj |= Q(profile_skills__skill__slug__iexact=term) | Q(profile_skills__skill__name__icontains=term)
        queryset = queryset.filter(q_obj)

    q = params.get("q")
    if q:
        q_obj = Q()
        for term in expanded_terms(q):
            q_obj |= (
                Q(display_name__icontains=term)
                | Q(major__icontains=term)
                | Q(headline__icontains=term)
                | Q(bio__icontains=term)
                | Q(interests__icontains=term)
                | Q(profile_skills__skill__name__icontains=term)
                | Q(profile_skills__skill__category__name__icontains=term)
                | Q(profile_skills__description__icontains=term)
            )
        queryset = queryset.filter(q_obj)

    return queryset.distinct().prefetch_related("profile_skills__skill__category", "credentials", "availability", "contact_methods", "reviews", "endorsements")


def calculate_profile_match(profile, query="", filters=None):
    filters = filters or {}
    score = 0
    reasons = []
    terms = expanded_terms(query)
    text = build_profile_search_text(profile)
    skill_names = [ps.skill.name.lower() for ps in profile.profile_skills.all()]
    category_names = [ps.skill.category.name.lower() for ps in profile.profile_skills.all()]
    skill_descriptions = " ".join(ps.description.lower() for ps in profile.profile_skills.all())

    for term in terms:
        if any(term == skill for skill in skill_names):
            score += 36
            reasons.append(f"Matches skill: {term.title()}")
        elif any(term in skill for skill in skill_names):
            score += 24
            reasons.append(f"Related skill match: {term.title()}")
        if any(term in category for category in category_names):
            score += 16
            reasons.append(f"Matches category: {term.title()}")
        if term in profile.headline.lower() or term in profile.bio.lower() or term in profile.interests.lower():
            score += 14
            reasons.append(f"Profile mentions {term}")
        if term in skill_descriptions:
            score += 14
            reasons.append(f"Skill description mentions {term}")

    requested_skills = []
    if filters.get("skill"):
        requested_skills.append(filters["skill"])
    if filters.get("skills"):
        requested_skills += [s.strip() for s in filters["skills"].split(",") if s.strip()]
    for skill in requested_skills:
        if any(term in name for term in expanded_terms(skill) for name in skill_names):
            score += 18
            reasons.append(f"Filtered skill match: {skill}")

    categories = []
    if filters.get("category"):
        categories.append(filters["category"])
    if filters.get("categories"):
        categories += [c.strip() for c in filters["categories"].split(",") if c.strip()]
    for category in categories:
        if any(category.lower() in name for name in category_names):
            score += 16
            reasons.append(f"Filtered category match: {category}")

    if filters.get("availability_day") or filters.get("availability_time"):
        score += 8
        reasons.append("Matches requested availability")
    elif profile.availability.filter(time_block__in=["evening", "flexible"]).exists():
        score += 4
        reasons.append("Available in evenings or flexible times")

    completeness_boost = min(profile.profile_completeness, 100) * 0.12
    score += completeness_boost
    if profile.profile_completeness >= 80:
        reasons.append("High profile completeness")

    if profile.credentials.filter(visibility="public").exists():
        score += 5
        reasons.append("Has public credential")
    if profile.open_to_connect:
        score += 5
        reasons.append("Open to connect")

    rating = profile.reviews.aggregate(avg=Avg("rating"), count=Count("id"))
    if rating["avg"]:
        score += min(rating["avg"] * 2, 10)
        reasons.append(f"Rated {rating['avg']:.1f}/5 by peers")
    if profile.endorsements.exists():
        score += min(profile.endorsements.count() * 2, 8)
        reasons.append("Has peer endorsements")

    if profile.updated_at >= timezone.now() - timezone.timedelta(days=45):
        score += 3
        reasons.append("Recently updated")

    unique_reasons = []
    for reason in reasons:
        if reason not in unique_reasons:
            unique_reasons.append(reason)
    return {"score": int(min(round(score), 100)), "reasons": unique_reasons[:6]}


def calculate_profile_match_score(profile, query="", filters=None):
    return calculate_profile_match(profile, query, filters)["score"]


def rank_profiles(queryset, query="", params=None):
    profiles = list(queryset.annotate(match_skill_count=Count("profile_skills"), average_rating=Avg("reviews__rating"), review_count=Count("reviews", distinct=True)))
    ranked = []
    for profile in profiles:
        match = calculate_profile_match(profile, query, params)
        profile.match_score = match["score"]
        profile.match_reasons = match["reasons"]
        ranked.append((match["score"], profile))
    ordering = (params or {}).get("ordering")
    if ordering in {"best_match", "match_score", "-match_score", None, ""}:
        ranked.sort(key=lambda item: (item[0], item[1].profile_completeness, item[1].updated_at), reverse=True)
    elif ordering in {"recently_active", "updated_at", "-updated_at"}:
        ranked.sort(key=lambda item: item[1].updated_at, reverse=True)
    elif ordering in {"highest_rated", "average_rating", "-average_rating"}:
        ranked.sort(key=lambda item: (item[1].reviews.aggregate(avg=Avg("rating"))["avg"] or 0, item[0]), reverse=True)
    elif ordering in {"most_endorsed", "endorsement_count", "-endorsement_count"}:
        ranked.sort(key=lambda item: (item[1].endorsements.count(), item[0]), reverse=True)
    elif ordering in {"newest_profiles", "created_at", "-created_at"}:
        ranked.sort(key=lambda item: item[1].created_at, reverse=True)
    elif ordering == "most_available":
        ranked.sort(key=lambda item: (item[1].open_to_connect, item[1].availability.count(), item[0]), reverse=True)
    elif ordering == "display_name":
        ranked.sort(key=lambda item: item[1].display_name.lower())
    elif ordering == "-display_name":
        ranked.sort(key=lambda item: item[1].display_name.lower(), reverse=True)
    elif ordering in {"profile_completeness", "-profile_completeness"}:
        ranked.sort(key=lambda item: item[1].profile_completeness, reverse=ordering.startswith("-"))
    elif ordering in {"created_at", "-created_at"}:
        ranked.sort(key=lambda item: item[1].created_at, reverse=ordering.startswith("-"))
    return ranked


def semantic_rank_profiles(queryset, query="", params=None):
    """
    Local AI-assisted semantic ranker:
    - concept detection via weighted term matching
    - profile scoring from skills/category/text/availability/credentials/open_to_connect
    """
    params = params or {}
    base_ranked = rank_profiles(queryset, query, params)
    query_tokens = set(_tokens(query))
    if not query_tokens:
        return base_ranked

    active_concepts = []
    for concept_name, spec in SEMANTIC_CONCEPTS.items():
        concept_terms = set(_tokens(" ".join(spec["terms"])))
        overlap = query_tokens.intersection(concept_terms)
        if overlap:
            active_concepts.append((concept_name, spec, len(overlap)))

    if not active_concepts:
        return base_ranked

    rescored = []
    for _, profile in base_ranked:
        # Keep some baseline relevance, but let semantic concept evidence dominate.
        base_score = getattr(profile, "match_score", 0)
        score = base_score * 0.35
        reasons = []
        profile_skill_names = [ps.skill.name for ps in profile.profile_skills.select_related("skill", "skill__category")]
        profile_skill_names_l = [s.lower() for s in profile_skill_names]
        profile_category_names_l = [ps.skill.category.name.lower() for ps in profile.profile_skills.select_related("skill__category")]
        profile_text = build_profile_search_text(profile)
        concept_hits = 0

        for _, spec, overlap_count in active_concepts:
            score += overlap_count * 20
            concept_skills = spec["skills"]
            concept_skill_matches = [skill for skill in concept_skills if skill.lower() in profile_skill_names_l]
            concept_category_matches = [c for c in spec["categories"] if c.lower() in profile_category_names_l]

            if concept_skill_matches:
                concept_hits += len(concept_skill_matches)
                score += 30 + (len(concept_skill_matches) * 8)
                reasons.append(f"Matches {', '.join(concept_skill_matches[:2])}")
            if concept_category_matches:
                concept_hits += len(concept_category_matches)
                score += 12
                reasons.append(f"Relevant {concept_category_matches[0]} background")

            for term in spec["terms"]:
                if term.lower() in profile_text:
                    score += 3
                    concept_hits += 1

        if concept_hits == 0:
            # For semantic mode, deprioritize profiles without concept evidence.
            score -= 25

        has_resume = profile.credentials.filter(credential_type="resume", visibility="public").exists()
        if has_resume:
            score += 6
            reasons.append("Has public resume")
        if profile.open_to_connect:
            score += 6
            reasons.append("Open to connect")
        if profile.availability.filter(time_block="evening").exists():
            score += 3
            reasons.append("Available during evenings")

        # keep concise, deduped reasons
        unique_reasons = []
        for reason in reasons:
            if reason not in unique_reasons:
                unique_reasons.append(reason)

        profile.match_score = int(max(min(round(score), 100), 0))
        profile.match_reasons = unique_reasons[:4]
        profile.semantic_reasons = unique_reasons[:3]
        profile.has_resume = has_resume
        profile.availability_summary = "Evenings" if profile.availability.filter(time_block="evening").exists() else ""
        rescored.append((profile.match_score, profile))

    rescored.sort(key=lambda item: (item[0], item[1].open_to_connect, item[1].profile_completeness, item[1].updated_at), reverse=True)
    return rescored


def recommend_profiles_for_user(user, queryset):
    profile = getattr(user, "profile", None)
    if not profile:
        return rank_profiles(queryset, "", {"ordering": "match_score"})
    skill_terms = [ps.skill.name for ps in profile.profile_skills.select_related("skill")]
    categories = [ps.skill.category.name for ps in profile.profile_skills.select_related("skill__category")]
    query = " ".join(skill_terms + categories + _tokens(profile.interests))
    ranked = rank_profiles(queryset.exclude(user=user), query, {"open_to_connect": "true"})
    for _, recommended in ranked:
        overlaps = set(s.lower() for s in skill_terms) & set(ps.skill.name.lower() for ps in recommended.profile_skills.all())
        if overlaps:
            recommended.match_reasons = [f"Shares interest in {next(iter(overlaps)).title()}"] + recommended.match_reasons
    return ranked


def similar_profiles_for(profile, queryset):
    skill_names = [ps.skill.name for ps in profile.profile_skills.select_related("skill")]
    categories = [ps.skill.category.name for ps in profile.profile_skills.select_related("skill__category")]
    query = " ".join(skill_names + categories + _tokens(profile.interests))
    return rank_profiles(queryset.exclude(pk=profile.pk), query, {"open_to_connect": "true"})


def extract_keywords_from_profile(profile):
    text = build_profile_search_text(profile)
    words = [w.strip(".,;:!?()[]").lower() for w in text.split()]
    stopwords = {"with", "and", "the", "for", "that", "this", "from", "help", "student", "students", "illinois"}
    counts = Counter(w for w in words if len(w) > 3 and w not in stopwords)
    return [word for word, _ in counts.most_common(20)]


def fallback_semantic_similarity(query, search_text):
    return SequenceMatcher(None, (query or "").lower(), (search_text or "").lower()).ratio()


def rebuild_profile_search_index(profile):
    text = build_profile_search_text(profile)
    skills = [ps.skill.name for ps in profile.profile_skills.select_related("skill")]
    index, _ = ProfileSearchIndex.objects.update_or_create(
        profile=profile,
        defaults={
            "search_text": text,
            "extracted_keywords": extract_keywords_from_profile(profile),
            "suggested_skill_names": skills,
            "embedding": None,
        },
    )
    return index


def rebuild_all_profile_search_indexes():
    from profiles.models import StudentProfile

    for profile in StudentProfile.objects.prefetch_related("profile_skills__skill__category", "credentials"):
        rebuild_profile_search_index(profile)
