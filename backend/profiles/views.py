from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.analytics import track_event
from discovery.services import apply_discovery_filters, base_discoverable_queryset, rebuild_profile_search_index, similar_profiles_for
from .models import Availability, ContactMethod, Credential, ProfileSkill, StudentProfile
from .serializers import (
    AvailabilitySerializer,
    ContactMethodSerializer,
    CredentialSerializer,
    ProfileSkillSerializer,
    PublicStudentProfileDetailSerializer,
    PublicStudentProfileListSerializer,
    StudentProfileCreateUpdateSerializer,
    StudentProfileSerializer,
)


class CurrentProfileView(APIView):
    permission_classes = [IsAuthenticated]
    serializer_class = StudentProfileSerializer

    def get(self, request):
        profile = get_object_or_404(StudentProfile, user=request.user)
        return Response(StudentProfileSerializer(profile, context={"request": request}).data)

    def post(self, request):
        serializer = StudentProfileCreateUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        track_event(request.user, "profile_created", {"profile_id": profile.id}, request)
        rebuild_profile_search_index(profile)
        return Response(StudentProfileSerializer(profile, context={"request": request}).data, status=status.HTTP_201_CREATED)

    def patch(self, request):
        profile = get_object_or_404(StudentProfile, user=request.user)
        serializer = StudentProfileCreateUpdateSerializer(profile, data=request.data, partial=True, context={"request": request})
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        track_event(request.user, "profile_updated", {"profile_id": profile.id}, request)
        rebuild_profile_search_index(profile)
        return Response(StudentProfileSerializer(profile, context={"request": request}).data)


class PublicProfileListView(generics.ListAPIView):
    serializer_class = PublicStudentProfileListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        ordering = self.request.query_params.get("ordering")
        queryset = apply_discovery_filters(StudentProfile.objects.all(), self.request.query_params, user=self.request.user)
        if ordering in {"display_name", "-display_name", "profile_completeness", "-profile_completeness", "updated_at", "-updated_at"}:
            queryset = queryset.order_by(ordering)
        return queryset


class PublicProfileDetailView(generics.RetrieveAPIView):
    serializer_class = PublicStudentProfileDetailSerializer
    permission_classes = [IsAuthenticated]
    queryset = StudentProfile.objects.filter(visibility="public").prefetch_related(
        "profile_skills__skill__category", "contact_methods", "availability", "credentials", "reviews"
    )

    def retrieve(self, request, *args, **kwargs):
        response = super().retrieve(request, *args, **kwargs)
        track_event(request.user, "profile_viewed", {"profile_id": self.get_object().id}, request)
        return response


class OwnedNestedViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_profile(self):
        return get_object_or_404(StudentProfile, user=self.request.user)

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return self.model.objects.none()
        return self.model.objects.filter(profile=self.get_profile())

    def perform_create(self, serializer):
        profile = self.get_profile()
        serializer.save(profile=profile)
        profile.update_profile_completeness()
        rebuild_profile_search_index(profile)

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.profile.update_profile_completeness()
        rebuild_profile_search_index(instance.profile)

    def perform_destroy(self, instance):
        profile = instance.profile
        instance.delete()
        profile.update_profile_completeness()
        rebuild_profile_search_index(profile)


class ProfileSkillViewSet(OwnedNestedViewSet):
    model = ProfileSkill
    serializer_class = ProfileSkillSerializer


class ContactMethodViewSet(OwnedNestedViewSet):
    model = ContactMethod
    serializer_class = ContactMethodSerializer


class AvailabilityViewSet(OwnedNestedViewSet):
    model = Availability
    serializer_class = AvailabilitySerializer


class CredentialViewSet(OwnedNestedViewSet):
    model = Credential
    serializer_class = CredentialSerializer


def ensure_profile_owner(profile, user):
    if profile.user_id != user.id:
        raise PermissionDenied("You cannot edit another user's profile.")


class SimilarProfilesView(generics.ListAPIView):
    serializer_class = PublicStudentProfileListSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return StudentProfile.objects.none()
        profile = get_object_or_404(StudentProfile, pk=self.kwargs["pk"], visibility="public")
        queryset = base_discoverable_queryset(StudentProfile.objects.filter(open_to_connect=True), user=self.request.user)
        ranked = similar_profiles_for(profile, queryset)[:10]
        return [profile for _, profile in ranked]


class ContactClickView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=dict)
    def post(self, request, pk):
        profile = get_object_or_404(StudentProfile, pk=pk, visibility="public")
        contact_method_id = request.data.get("contact_method_id")
        contact = get_object_or_404(ContactMethod, pk=contact_method_id, profile=profile, is_public=True)
        track_event(request.user, "contact_clicked", {"profile_id": profile.id, "contact_method_id": contact.id, "type": contact.type}, request)
        return Response({"success": True, "message": "Contact click recorded.", "data": {"contact_method_id": contact.id}})
