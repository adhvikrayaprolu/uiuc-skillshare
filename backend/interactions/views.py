from django.db.models import Q
from django.shortcuts import get_object_or_404
from rest_framework import generics, viewsets
from rest_framework.permissions import IsAuthenticated

from profiles.models import StudentProfile
from .models import BlockedUser, Endorsement, HelpRequest, Report, Review, SavedProfile
from .permissions import IsHelpRequestParticipant, IsReviewOwnerOrReadOnly
from .serializers import BlockedUserSerializer, EndorsementSerializer, HelpRequestSerializer, ReportSerializer, ReviewSerializer, SavedProfileSerializer


class SavedProfileViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = SavedProfileSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return SavedProfile.objects.none()
        return SavedProfile.objects.filter(seeker=self.request.user).select_related("saved_profile")


class ProfileReviewListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReviewSerializer

    def get_profile(self):
        return get_object_or_404(StudentProfile, pk=self.kwargs["profile_id"], visibility="public")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Review.objects.none()
        return Review.objects.filter(profile=self.get_profile()).select_related("reviewer", "related_skill")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["profile"] = self.get_profile()
        return context


class ReviewDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsAuthenticated, IsReviewOwnerOrReadOnly]
    serializer_class = ReviewSerializer
    queryset = Review.objects.select_related("reviewer", "profile")
    http_method_names = ["get", "patch", "delete", "head", "options"]


class ProfileEndorsementListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EndorsementSerializer

    def get_profile(self):
        return get_object_or_404(StudentProfile, pk=self.kwargs["profile_id"], visibility="public")

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Endorsement.objects.none()
        return Endorsement.objects.filter(profile=self.get_profile()).select_related("endorser", "skill")

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context["profile"] = self.get_profile()
        return context


class EndorsementDetailView(generics.DestroyAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = EndorsementSerializer

    def get_queryset(self):
        return Endorsement.objects.filter(endorser=self.request.user)


class HelpRequestViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated, IsHelpRequestParticipant]
    serializer_class = HelpRequestSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return HelpRequest.objects.none()
        return (
            HelpRequest.objects.filter(Q(seeker=self.request.user) | Q(helper_profile__user=self.request.user))
            .select_related("seeker", "seeker__profile", "helper_profile", "related_skill")
            .prefetch_related("helper_profile__contact_methods", "seeker__profile__contact_methods")
        )

    def perform_create(self, serializer):
        serializer.save(seeker=self.request.user)


class ReportCreateView(generics.CreateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = ReportSerializer


class BlockedUserViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = BlockedUserSerializer
    http_method_names = ["get", "post", "delete", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return BlockedUser.objects.none()
        return BlockedUser.objects.filter(blocker=self.request.user).select_related("blocked_user")
