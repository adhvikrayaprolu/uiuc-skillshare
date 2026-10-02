from django.shortcuts import get_object_or_404
from drf_spectacular.utils import extend_schema
from rest_framework import generics, status, viewsets
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from common.analytics import track_event
from discovery.services import apply_discovery_filters, base_discoverable_queryset, rebuild_profile_search_index, similar_profiles_for
from .policy import can_share_contacts, visible_profiles
from .models import Availability, ContactMethod, Credential, ProfileSkill, StudentProfile
from .serializers import (
    AvailabilitySerializer,
    ContactMethodSerializer,
    CredentialSerializer,
    ProfileSkillSerializer,
    ProfileAggregateSerializer,
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

    @extend_schema(request=StudentProfileCreateUpdateSerializer, responses={201: StudentProfileSerializer})
    def post(self, request):
        serializer = StudentProfileCreateUpdateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        profile = serializer.save()
        track_event(request.user, "profile_created", {"profile_id": profile.id}, request)
        rebuild_profile_search_index(profile)
        return Response(StudentProfileSerializer(profile, context={"request": request}).data, status=status.HTTP_201_CREATED)

    @extend_schema(request=StudentProfileCreateUpdateSerializer, responses=StudentProfileSerializer)
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
        if getattr(self, "swagger_fake_view", False):
            return StudentProfile.objects.none()
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

    def get_queryset(self):
        return visible_profiles(super().get_queryset(), self.request.user)

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
        profile.update_onboarding()
        rebuild_profile_search_index(profile)

    def perform_update(self, serializer):
        instance = serializer.save()
        instance.profile.update_profile_completeness()
        instance.profile.update_onboarding()
        rebuild_profile_search_index(instance.profile)

    def perform_destroy(self, instance):
        profile = instance.profile
        instance.delete()
        profile.update_profile_completeness()
        profile.update_onboarding()
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
        profile = get_object_or_404(visible_profiles(StudentProfile.objects.all(), self.request.user), pk=self.kwargs["pk"])
        queryset = base_discoverable_queryset(StudentProfile.objects.filter(open_to_connect=True), user=self.request.user)
        ranked = similar_profiles_for(profile, queryset, user=self.request.user)[:10]
        return [profile for _, profile in ranked]


class ContactClickView(APIView):
    permission_classes = [IsAuthenticated]

    @extend_schema(request=None, responses=dict)
    def post(self, request, pk):
        profile = get_object_or_404(visible_profiles(StudentProfile.objects.all(), request.user), pk=pk)
        if not can_share_contacts(request.user, profile):
            raise PermissionDenied("Contacts are shared only after request acceptance.")
        contact_method_id = request.data.get("contact_method_id")
        contact = get_object_or_404(ContactMethod, pk=contact_method_id, profile=profile, is_public=True)
        track_event(request.user, "contact_clicked", {"profile_id": profile.id, "contact_method_id": contact.id, "type": contact.type}, request)
        return Response({"success": True, "message": "Contact click recorded.", "data": {"contact_method_id": contact.id}})


class CurrentProfileAggregateView(APIView):
    serializer_class = ProfileAggregateSerializer
    """Replace the current user's edited profile as one validated transaction."""
    permission_classes = [IsAuthenticated]

    @extend_schema(request=ProfileAggregateSerializer, responses=StudentProfileSerializer)
    def put(self, request):
        from django.db import transaction
        from accounts.models import User
        from .serializers import ProfileAggregateSerializer
        serializer = ProfileAggregateSerializer(data=request.data, context={"request": request})
        serializer.is_valid(raise_exception=True)
        payload = serializer.validated_data
        with transaction.atomic():
            User.objects.select_for_update().get(pk=request.user.pk)
            profile = StudentProfile.objects.filter(user=request.user).first()
            writer = StudentProfileCreateUpdateSerializer(profile, data=payload["profile"], partial=profile is not None, context={"request": request})
            writer.is_valid(raise_exception=True)
            profile = writer.save()
            for key, relation, model in [("skills", "profile_skills", ProfileSkill),
                                         ("availability", "availability", Availability),
                                         ("contacts", "contact_methods", ContactMethod),
                                         ("credentials", "credentials", Credential)]:
                if key not in payload:
                    continue
                getattr(profile, relation).all().delete()
                for row in payload[key]:
                    model.objects.create(profile=profile, **row)
            profile.update_profile_completeness()
            profile.update_onboarding()
            if "availability" in payload:
                from django.utils import timezone
                profile.availability_confirmed_at = timezone.now()
                profile.save(update_fields=["availability_confirmed_at"])
            rebuild_profile_search_index(profile)
            track_event(request.user, "profile_updated", {"profile_id": profile.id}, request)
        return Response(StudentProfileSerializer(profile, context={"request": request}).data)
