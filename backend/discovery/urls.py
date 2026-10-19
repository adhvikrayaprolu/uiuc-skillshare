from django.urls import path

from .views import CommunityView, DiscoverySearchView, RecommendedProfilesView, SwapMatchesView


urlpatterns = [
    path("search/", DiscoverySearchView.as_view(), name="discovery-search"),
    path("recommended/", RecommendedProfilesView.as_view(), name="discovery-recommended"),
    path("swaps/", SwapMatchesView.as_view(), name="discovery-swaps"),
    path("community/", CommunityView.as_view(), name="discovery-community"),
]
