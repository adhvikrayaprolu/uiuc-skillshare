from django.urls import path

from .views import (
    AvailabilityViewSet,
    ContactMethodViewSet,
    CredentialViewSet,
    CurrentProfileView,
    ProfileSkillViewSet,
    PublicProfileDetailView,
    PublicProfileListView,
    SimilarProfilesView,
    ContactClickView,
)

profile_skill_list = ProfileSkillViewSet.as_view({"get": "list", "post": "create"})
profile_skill_detail = ProfileSkillViewSet.as_view({"patch": "partial_update", "delete": "destroy"})
contact_list = ContactMethodViewSet.as_view({"get": "list", "post": "create"})
contact_detail = ContactMethodViewSet.as_view({"patch": "partial_update", "delete": "destroy"})
availability_list = AvailabilityViewSet.as_view({"get": "list", "post": "create"})
availability_detail = AvailabilityViewSet.as_view({"patch": "partial_update", "delete": "destroy"})
credential_list = CredentialViewSet.as_view({"get": "list", "post": "create"})
credential_detail = CredentialViewSet.as_view({"patch": "partial_update", "delete": "destroy"})

urlpatterns = [
    path("profiles/me/", CurrentProfileView.as_view(), name="profile-me"),
    path("profiles/", PublicProfileListView.as_view(), name="profiles-list"),
    path("profiles/<int:pk>/", PublicProfileDetailView.as_view(), name="profiles-detail"),
    path("profiles/<int:pk>/similar/", SimilarProfilesView.as_view(), name="profiles-similar"),
    path("profiles/<int:pk>/contact-click/", ContactClickView.as_view(), name="profile-contact-click"),
    path("profiles/me/skills/", profile_skill_list, name="profile-skills-list"),
    path("profiles/me/skills/<int:pk>/", profile_skill_detail, name="profile-skills-detail"),
    path("profiles/me/contact-methods/", contact_list, name="contact-methods-list"),
    path("profiles/me/contact-methods/<int:pk>/", contact_detail, name="contact-methods-detail"),
    path("profiles/me/availability/", availability_list, name="availability-list"),
    path("profiles/me/availability/<int:pk>/", availability_detail, name="availability-detail"),
    path("profiles/me/credentials/", credential_list, name="credentials-list"),
    path("profiles/me/credentials/<int:pk>/", credential_detail, name="credentials-detail"),
]
