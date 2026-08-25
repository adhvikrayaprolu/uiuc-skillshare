from rest_framework.pagination import PageNumberPagination
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.analytics import track_event
from profiles.models import StudentProfile
from profiles.serializers import PublicStudentProfileListSerializer
from .services import apply_discovery_filters, recommend_profiles_for_user, rank_profiles, semantic_rank_profiles


class DiscoverySearchView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = PublicStudentProfileListSerializer

    def get(self, request):
        queryset = apply_discovery_filters(StudentProfile.objects.all(), request.query_params, user=request.user)
        query = request.query_params.get("q", "")
        mode = request.query_params.get("mode", "").lower().strip()
        is_semantic = mode == "semantic" and bool(query.strip())
        ranked = semantic_rank_profiles(queryset, query, request.query_params) if is_semantic else rank_profiles(queryset, query, request.query_params)
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
        response.data["ai"] = {
            "enabled": is_semantic,
            "mode": "local_weighted_semantic_matcher" if is_semantic else "default_ranking",
            "model": "rule-based semantic concept matcher" if is_semantic else "keyword matching ranker",
            "query": query,
        }
        return response


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
        return paginator.get_paginated_response(serializer.data)
