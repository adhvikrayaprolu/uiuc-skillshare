from django.conf import settings
from google.auth.transport import requests as google_requests
from google.oauth2 import id_token as google_id_token
from rest_framework import serializers

from .models import User


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "is_student_verified", "has_completed_onboarding"]
        read_only_fields = ["id", "email", "is_student_verified", "has_completed_onboarding"]


class CurrentUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ["id", "email", "first_name", "last_name", "is_student_verified", "has_completed_onboarding"]
        read_only_fields = ["id", "email", "is_student_verified", "has_completed_onboarding"]


class DevLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        email = value.strip().lower()
        if not email.endswith("@illinois.edu"):
            raise serializers.ValidationError("Only @illinois.edu accounts are allowed.")
        return email


class GoogleAuthSerializer(serializers.Serializer):
    id_token = serializers.CharField(write_only=True)

    def validate(self, attrs):
        token = attrs["id_token"]
        audience = settings.GOOGLE_CLIENT_ID or None
        try:
            payload = google_id_token.verify_oauth2_token(token, google_requests.Request(), audience=audience)
        except ValueError as exc:
            raise serializers.ValidationError({"id_token": "Invalid Google ID token."}) from exc

        email = (payload.get("email") or "").lower()
        if not email.endswith("@illinois.edu"):
            raise serializers.ValidationError({"email": "Only @illinois.edu accounts can sign in."}, code="forbidden")

        hd = payload.get("hd")
        if hd and hd != "illinois.edu":
            raise serializers.ValidationError({"email": "Google hosted domain must be illinois.edu."}, code="forbidden")

        attrs["payload"] = payload
        return attrs
