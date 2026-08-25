from django.urls import path

from .views import (
    BlockedUserViewSet,
    EndorsementDetailView,
    HelpRequestViewSet,
    ProfileEndorsementListCreateView,
    ProfileReviewListCreateView,
    ReportCreateView,
    ReviewDetailView,
    SavedProfileViewSet,
)

saved_list = SavedProfileViewSet.as_view({"get": "list", "post": "create"})
saved_detail = SavedProfileViewSet.as_view({"delete": "destroy"})
help_list = HelpRequestViewSet.as_view({"get": "list", "post": "create"})
help_detail = HelpRequestViewSet.as_view({"get": "retrieve", "patch": "partial_update"})
blocked_list = BlockedUserViewSet.as_view({"get": "list", "post": "create"})
blocked_detail = BlockedUserViewSet.as_view({"delete": "destroy"})

urlpatterns = [
    path("saved-profiles/", saved_list, name="saved-profiles-list"),
    path("saved-profiles/<int:pk>/", saved_detail, name="saved-profiles-detail"),
    path("profiles/<int:profile_id>/reviews/", ProfileReviewListCreateView.as_view(), name="profile-reviews"),
    path("reviews/<int:pk>/", ReviewDetailView.as_view(), name="review-detail"),
    path("profiles/<int:profile_id>/endorsements/", ProfileEndorsementListCreateView.as_view(), name="profile-endorsements"),
    path("endorsements/<int:pk>/", EndorsementDetailView.as_view(), name="endorsement-detail"),
    path("help-requests/", help_list, name="help-requests-list"),
    path("help-requests/<int:pk>/", help_detail, name="help-requests-detail"),
    path("reports/", ReportCreateView.as_view(), name="reports-list"),
    path("blocked-users/", blocked_list, name="blocked-users-list"),
    path("blocked-users/<int:pk>/", blocked_detail, name="blocked-users-detail"),
]
