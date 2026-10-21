from django.db.models import Count
from drf_spectacular.utils import extend_schema
from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.analytics import track_event
from profiles.models import ProfileSkill, StudentProfile
from profiles.serializers import PublicStudentProfileListSerializer
from .services import apply_discovery_filters, recommend_profiles_for_user, rank_profiles, semantic_rank_profiles, swap_matches_for_user


class DiscoverySearchView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PublicStudentProfileListSerializer

    def get(self, request):
        queryset = apply_discovery_filters(StudentProfile.objects.all(), request.query_params, user=request.user)
        query = request.query_params.get("q", "")
        mode = request.query_params.get("mode", "").lower().strip()
        is_semantic = mode == "semantic" and bool(query.strip())
        ranked = semantic_rank_profiles(queryset, query, request.query_params, user=request.user) if is_semantic else rank_profiles(queryset, query, request.query_params, user=request.user)
        profiles = [profile for _, profile in ranked]
        track_event(
            request.user,
            "search_performed",
            {"q": query, "params": dict(request.query_params), "result_count": len(profiles), "mode": mode or "default"},
            request,
        )
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(profiles, request)
        serializer = PublicStudentProfileListSerializer(page, many=True, context={"request": request})
        response = paginator.get_paginated_response(serializer.data)
        response.data["matching"] = ranked.metadata
        response.data["matching"]["requested_mode"] = mode or "keyword"
        if not is_semantic:
            response.data["matching"]["fallback_reason"] = None
        return response


class SwapMatchesView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PublicStudentProfileListSerializer

    def get(self, request):
        queryset = apply_discovery_filters(StudentProfile.objects.all(), {}, user=request.user)
        ranked = swap_matches_for_user(request.user, queryset)
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset([profile for _, profile in ranked], request)
        serializer = PublicStudentProfileListSerializer(page, many=True, context={"request": request})
        response = paginator.get_paginated_response(serializer.data)
        response.data["matching"] = ranked.metadata
        return response


class CommunityView(APIView):
    """Cold-start hints. Learner counts only include members who made their learning goals public."""
    permission_classes = [IsAuthenticated]

    @extend_schema(responses=dict)
    def get(self, request):
        peers = apply_discovery_filters(StudentProfile.objects.all(), {}, user=request.user)
        popular = list(
            ProfileSkill.objects.filter(profile__in=peers, skill__is_approved=True)
            .values("skill_id", "skill__name").annotate(teachers=Count("profile", distinct=True))
            .order_by("-teachers", "skill__name")[:8]
        )
        taught = set(ProfileSkill.objects.filter(profile__in=peers).values_list("skill_id", flat=True))
        goals = StudentProfile.learning_goals.through.objects
        wanted = (
            goals.filter(studentprofile__in=peers.filter(learning_goals_public=True), skilltag__is_approved=True)
            .exclude(skilltag_id__in=taught)
            .values("skilltag_id", "skilltag__name").annotate(learners=Count("studentprofile_id", distinct=True))
            .order_by("-learners", "skilltag__name")[:5]
        )
        mine = getattr(request.user, "profile", None)
        untaught = list(mine.learning_goals.exclude(pk__in=taught).order_by("name").values("id", "name")[:5]) if mine else []
        return Response({
            "member_count": peers.count(),
            "popular": [{"id": row["skill_id"], "name": row["skill__name"], "teachers": row["teachers"]} for row in popular],
            "unmet": [{"id": row["skilltag_id"], "name": row["skilltag__name"], "learners": row["learners"]} for row in wanted],
            "my_untaught_goals": untaught,
        })


class RecommendedProfilesView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PublicStudentProfileListSerializer

    def get(self, request):
        queryset = apply_discovery_filters(StudentProfile.objects.exclude(user=request.user), {"open_to_connect": "true"}, user=request.user)
        ranked = recommend_profiles_for_user(request.user, queryset)
        profiles = [profile for _, profile in ranked]
        paginator = PageNumberPagination()
        page = paginator.paginate_queryset(profiles, request)
        serializer = PublicStudentProfileListSerializer(page, many=True, context={"request": request})
        response = paginator.get_paginated_response(serializer.data)
        response.data["matching"] = ranked.metadata
        return response
