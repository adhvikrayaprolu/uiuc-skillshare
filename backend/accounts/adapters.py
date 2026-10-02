import time
from django.conf import settings
from django.core.exceptions import ValidationError
from django.http import JsonResponse
from allauth.account.adapter import DefaultAccountAdapter
from allauth.account.models import EmailAddress
from allauth.core.exceptions import ImmediateHttpResponse
from allauth.socialaccount.adapter import DefaultSocialAccountAdapter

from .models import User


def illinois_email(email):
    email = (email or "").strip().lower()
    if email.rpartition("@")[2] != "illinois.edu":
        raise ValidationError("Use an @illinois.edu email address.")
    return email


def deny(message, status=403):
    raise ImmediateHttpResponse(JsonResponse({"status": status, "errors": [{"message": message}]}, status=status))


class AccountAdapter(DefaultAccountAdapter):
    def clean_email(self, email):
        return illinois_email(email)

    def is_open_for_signup(self, request):
        return False  # Accounts are created only by the narrow email/Google flows.

    def pre_login(self, request, user, **kwargs):
        if not user.is_active or user.is_demo:
            deny("This account cannot sign in.")
        illinois_email(user.email)
        if not EmailAddress.objects.filter(user=user, email__iexact=user.email, verified=True).exists():
            deny("Verify your Illinois email before signing in.")
        if not user.is_student_verified:
            user.is_student_verified = True
            user.save(update_fields=["is_student_verified", "updated_at"])
        return super().pre_login(request, user, **kwargs)


class SocialAdapter(DefaultSocialAccountAdapter):
    def is_open_for_signup(self, request, sociallogin):
        return True

    def pre_social_login(self, request, sociallogin):
        data = sociallogin.account.extra_data
        if not settings.GOOGLE_CLIENT_ID or data.get("aud") != settings.GOOGLE_CLIENT_ID:
            deny("Google sign-in is unavailable or has an invalid audience.")
        try:
            email = illinois_email(data.get("email"))
        except ValidationError:
            deny("Use an Illinois email address.")
        if data.get("iss") not in {"https://accounts.google.com", "accounts.google.com"} or not isinstance(data.get("exp"), (int, float)) or data["exp"] <= time.time():
            deny("Google identity is expired or has an invalid issuer.")
        if data.get("email_verified") is not True or not isinstance(data.get("sub"), str) or not data["sub"]:
            deny("Google did not verify this identity.")
        if data.get("hd") != "illinois.edu":
            deny("Verify your Illinois email with a code to continue.", status=409)
        existing = User.objects.filter(email__iexact=email).first()
        if not sociallogin.is_existing and existing:
            deny("This email already has an account. Sign in with an email code; automatic linking is disabled.", status=409)
        if sociallogin.is_existing and (not sociallogin.user.is_active or sociallogin.user.is_demo):
            deny("This account cannot sign in.")

    def save_user(self, request, sociallogin, form=None):
        user = super().save_user(request, sociallogin, form=form)
        user.google_sub = sociallogin.account.uid
        user.is_student_verified = True
        user.save(update_fields=["google_sub", "is_student_verified", "updated_at"])
        return user
