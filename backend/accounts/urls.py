from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import DevLoginView, GoogleAuthView, MeView


urlpatterns = [
    path("dev-login/", DevLoginView.as_view(), name="dev-login"),
    path("google/", GoogleAuthView.as_view(), name="google-auth"),
    path("token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="auth-me"),
]
