from django.utils.text import slugify
from rest_framework import serializers

from .models import SkillCategory, SkillTag


class SkillCategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = SkillCategory
        fields = ["id", "name", "slug", "description"]


class SkillTagSerializer(serializers.ModelSerializer):
    category = SkillCategorySerializer(read_only=True)
    category_id = serializers.PrimaryKeyRelatedField(source="category", queryset=SkillCategory.objects.all(), write_only=True)

    class Meta:
        model = SkillTag
        fields = ["id", "category", "category_id", "name", "slug", "description", "is_approved"]
        read_only_fields = ["slug", "is_approved"]


class SkillTagCreateSerializer(serializers.ModelSerializer):
    category = serializers.PrimaryKeyRelatedField(queryset=SkillCategory.objects.all())

    class Meta:
        model = SkillTag
        fields = ["id", "category", "name", "description"]

    def create(self, validated_data):
        validated_data["slug"] = slugify(validated_data["name"])
        validated_data["is_approved"] = False
        validated_data["created_by"] = self.context["request"].user
        return super().create(validated_data)
