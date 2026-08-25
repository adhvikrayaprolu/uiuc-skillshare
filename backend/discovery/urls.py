from django.urls import path

from .views import DiscoverySearchView, RecommendedProfilesView


urlpatterns = [
    path("search/", DiscoverySearchView.as_view(), name="discovery-search"),
    path("recommended/", RecommendedProfilesView.as_view(), name="discovery-recommended"),
]
