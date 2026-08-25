from django.db.models import Count, Q
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .models import SkillCategory, SkillTag
from .serializers import SkillCategorySerializer, SkillTagCreateSerializer, SkillTagSerializer


class SkillCategoryListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    queryset = SkillCategory.objects.all()
    serializer_class = SkillCategorySerializer


class SkillTagListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SkillTagSerializer

    def get_queryset(self):
        qs = SkillTag.objects.select_related("category").all()
        params = self.request.query_params
        if params.get("q"):
            qs = qs.filter(Q(name__icontains=params["q"]) | Q(description__icontains=params["q"]))
        if params.get("category"):
            qs = qs.filter(Q(category__slug=params["category"]) | Q(category__name__icontains=params["category"]))
        if params.get("is_approved") is not None:
            qs = qs.filter(is_approved=str(params["is_approved"]).lower() in {"true", "1", "yes"})
        return qs


class PopularSkillListView(generics.ListAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SkillTagSerializer

    def get_queryset(self):
        return SkillTag.objects.select_related("category").filter(is_approved=True).annotate(profile_count=Count("profile_skills")).order_by("-profile_count", "name")[:20]


class SkillSuggestView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = SkillTagCreateSerializer
