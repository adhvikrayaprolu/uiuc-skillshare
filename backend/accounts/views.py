from django.conf import settings
from django.db import IntegrityError
from rest_framework import generics, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from profiles.models import StudentProfile

from .models import User
from .serializers import CurrentUserSerializer, DevLoginSerializer, GoogleAuthSerializer


class GoogleAuthView(APIView):
    permission_classes = [AllowAny]
    throttle_scope = "auth_google"
    serializer_class = GoogleAuthSerializer

    def post(self, request):
        serializer = GoogleAuthSerializer(data=request.data)
        if not serializer.is_valid():
            errors = serializer.errors
            if "email" in errors:
                raise PermissionDenied(errors["email"][0])
            return Response(errors, status=status.HTTP_400_BAD_REQUEST)
        payload = serializer.validated_data["payload"]
        email = payload["email"].lower()
        defaults = {
            "first_name": payload.get("given_name", ""),
            "last_name": payload.get("family_name", ""),
            "google_sub": payload.get("sub"),
            "is_student_verified": True,
        }
        try:
            user, _ = User.objects.update_or_create(email=email, defaults=defaults)
        except IntegrityError:
            user = User.objects.get(email=email)
            user.google_sub = defaults["google_sub"]
            user.is_student_verified = True
            user.save(update_fields=["google_sub", "is_student_verified", "updated_at"])

        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh), "user": CurrentUserSerializer(user).data})


class DevLoginView(APIView):
    """
    DEBUG-only token login for local class demos (no Google OAuth).
    POST {"email": "user@illinois.edu"}
    """

    permission_classes = [AllowAny]
    serializer_class = DevLoginSerializer

    def post(self, request):
        if not settings.DEBUG:
            return Response(status=status.HTTP_404_NOT_FOUND)
        serializer = DevLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        email = serializer.validated_data["email"]
        local = email.split("@", 1)[0]
        parts = local.split(".")
        first_name = parts[0].title() if parts else ""
        last_name = " ".join(p.title() for p in parts[1:]) if len(parts) > 1 else ""

        user, created = User.objects.get_or_create(
            email=email,
            defaults={
                "first_name": first_name,
                "last_name": last_name,
                "is_student_verified": True,
                "has_completed_onboarding": True,
            },
        )
        if not created:
            updates = []
            if not user.first_name and first_name:
                user.first_name = first_name
                updates.append("first_name")
            if not user.last_name and last_name:
                user.last_name = last_name
                updates.append("last_name")
            if not user.is_student_verified:
                user.is_student_verified = True
                updates.append("is_student_verified")
            if not user.has_completed_onboarding:
                user.has_completed_onboarding = True
                updates.append("has_completed_onboarding")
            if updates:
                user.save(update_fields=updates + ["updated_at"])

        if not StudentProfile.objects.filter(user_id=user.id).exists():
            display = f"{user.first_name} {user.last_name}".strip() or email
            stub = StudentProfile.objects.create(
                user=user,
                display_name=display,
                major="Undeclared",
                year="other",
                headline="Illinois student",
                bio="",
                interests="",
                open_to_connect=True,
                visibility="public",
                preferred_contact_method="email",
            )
            stub.update_profile_completeness()

        refresh = RefreshToken.for_user(user)
        return Response({"access": str(refresh.access_token), "refresh": str(refresh), "user": CurrentUserSerializer(user).data})


class MeView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsAuthenticated]
    serializer_class = CurrentUserSerializer

    def get_object(self):
        return self.request.user
