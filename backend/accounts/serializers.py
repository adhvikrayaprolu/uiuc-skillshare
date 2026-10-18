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
