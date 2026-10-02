from django.conf import settings
from django.contrib.auth import logout
from django.core.exceptions import ValidationError
from django.db import transaction
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.views.decorators.csrf import ensure_csrf_cookie
from allauth.account.internal.flows.login_by_code import LoginCodeVerificationProcess
from allauth.account.models import EmailAddress
from allauth.headless.account.views import RequestLoginCodeView, ResendLoginCodeView
from allauth.decorators import rate_limit
from django.utils.decorators import method_decorator
from allauth.headless.base.response import AuthenticationResponse
from allauth.headless.socialaccount.views import ProviderTokenView
from rest_framework import generics
from rest_framework.permissions import IsAuthenticated

from .adapters import illinois_email
from .models import User
from .serializers import CurrentUserSerializer


@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({"csrfToken": get_token(request), "googleEnabled": bool(settings.GOOGLE_CLIENT_ID)})


class EmailCodeRequestView(RequestLoginCodeView):
    def post(self, request, *args, **kwargs):
        try:
            email = illinois_email(self.input.cleaned_data.get("email"))
        except ValidationError:
            return JsonResponse({"status": 400, "errors": [{"message": "Use an @illinois.edu email address."}]}, status=400)
        # Provision only an unverified record; the allauth code owns expiry, attempts and replay prevention.
        with transaction.atomic():
            user, _ = User.objects.get_or_create(email=email)
            EmailAddress.objects.get_or_create(user=user, email=email, defaults={"primary": True, "verified": False})
        if not user.is_active or user.is_demo:
            user = None  # Preserve allauth's non-enumerating response and never issue a valid code.
        LoginCodeVerificationProcess.initiate(request=self.request, user=user, email=email)
        return AuthenticationResponse(self.request)


@method_decorator(rate_limit(action="login"), name="handle")
class GoogleAuthView(ProviderTokenView):
    def dispatch(self, request, *args, **kwargs):
        if not settings.GOOGLE_CLIENT_ID:
            return JsonResponse({"status": 503, "errors": [{"message": "Google sign-in is unavailable. Use an email code."}]}, status=503)
        return super().dispatch(request, *args, **kwargs)

    def post(self, request, *args, **kwargs):
        if self.input.cleaned_data["provider"].id != "google" or self.input.cleaned_data["process"] != "login":
            return JsonResponse({"status": 400, "errors": [{"message": "Automatic account linking is disabled."}]}, status=400)
        return super().post(request, *args, **kwargs)


@method_decorator(rate_limit(action="request_login_code"), name="handle")
class EmailCodeResendView(ResendLoginCodeView):
    pass


def session_logout(request):
    if request.method != "POST":
        return JsonResponse({"detail": "Use POST."}, status=405)
    logout(request)
    return JsonResponse({"success": True})


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CurrentUserSerializer

    def get_object(self):
        return self.request.user
