from django.db.models import Avg, Count
from rest_framework import serializers

from taxonomy.serializers import SkillTagSerializer
from .models import Availability, ContactMethod, Credential, ProfileSkill, StudentProfile


class ContactMethodSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactMethod
        fields = ["id", "type", "label", "value", "is_public", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class AvailabilitySerializer(serializers.ModelSerializer):
    class Meta:
        model = Availability
        fields = ["id", "day_of_week", "time_block", "notes", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class CredentialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Credential
        fields = ["id", "credential_type", "title", "url", "file", "visibility", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]

    def validate_file(self, value):
        if not value:
            return value
        allowed = {".pdf", ".png", ".jpg", ".jpeg", ".doc", ".docx"}
        name = value.name.lower()
        if not any(name.endswith(ext) for ext in allowed):
            raise serializers.ValidationError("Credential files must be pdf, png, jpg, jpeg, doc, or docx.")
        return value


class ProfileSkillSerializer(serializers.ModelSerializer):
    skill_detail = SkillTagSerializer(source="skill", read_only=True)

    class Meta:
        model = ProfileSkill
        fields = ["id", "skill", "skill_detail", "confidence_level", "description", "is_featured", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class StudentProfileSerializer(serializers.ModelSerializer):
    contact_methods = ContactMethodSerializer(many=True, read_only=True)
    availability = AvailabilitySerializer(many=True, read_only=True)
    credentials = CredentialSerializer(many=True, read_only=True)
    profile_skills = ProfileSkillSerializer(many=True, read_only=True)

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "display_name",
            "major",
            "year",
            "headline",
            "bio",
            "interests",
            "location",
            "profile_picture",
            "open_to_connect",
            "preferred_contact_method",
            "availability_notes",
            "visibility",
            "profile_completeness",
            "contact_methods",
            "availability",
            "credentials",
            "profile_skills",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "profile_completeness", "created_at", "updated_at"]


class StudentProfileCreateUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "display_name",
            "major",
            "year",
            "headline",
            "bio",
            "interests",
            "location",
            "profile_picture",
            "open_to_connect",
            "preferred_contact_method",
            "availability_notes",
            "visibility",
            "profile_completeness",
        ]
        read_only_fields = ["id", "profile_completeness"]

    def validate(self, attrs):
        request = self.context["request"]
        if request.method == "POST" and StudentProfile.objects.filter(user=request.user).exists():
            raise serializers.ValidationError("User cannot create more than one StudentProfile.")
        return attrs

    def create(self, validated_data):
        profile = StudentProfile.objects.create(user=self.context["request"].user, **validated_data)
        profile.update_profile_completeness()
        user = self.context["request"].user
        if not user.has_completed_onboarding:
            user.has_completed_onboarding = True
            user.save(update_fields=["has_completed_onboarding", "updated_at"])
        return profile

    def update(self, instance, validated_data):
        profile = super().update(instance, validated_data)
        profile.update_profile_completeness()
        return profile


class PublicStudentProfileListSerializer(serializers.ModelSerializer):
    top_skills = serializers.SerializerMethodField()
    top_categories = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    match_score = serializers.SerializerMethodField()
    match_reasons = serializers.SerializerMethodField()
    semantic_reasons = serializers.SerializerMethodField()
    has_resume = serializers.SerializerMethodField()
    availability_summary = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "display_name",
            "major",
            "year",
            "headline",
            "profile_picture",
            "top_skills",
            "top_categories",
            "open_to_connect",
            "preferred_contact_method",
            "profile_completeness",
            "average_rating",
            "review_count",
            "match_score",
            "match_reasons",
            "semantic_reasons",
            "has_resume",
            "availability_summary",
        ]

    def get_top_skills(self, obj):
        return [ps.skill.name for ps in obj.profile_skills.select_related("skill").order_by("-is_featured", "-updated_at")[:3]]

    def get_top_categories(self, obj):
        seen = []
        for ps in obj.profile_skills.select_related("skill__category").order_by("-is_featured", "-updated_at"):
            name = ps.skill.category.name
            if name not in seen:
                seen.append(name)
            if len(seen) == 3:
                break
        return seen

    def get_average_rating(self, obj):
        value = getattr(obj, "average_rating", None)
        if value is None:
            value = obj.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(value, 2) if value is not None else None

    def get_review_count(self, obj):
        value = getattr(obj, "review_count", None)
        return value if value is not None else obj.reviews.count()

    def get_match_score(self, obj):
        return getattr(obj, "match_score", None)

    def get_match_reasons(self, obj):
        return getattr(obj, "match_reasons", [])

    def get_semantic_reasons(self, obj):
        return getattr(obj, "semantic_reasons", [])

    def get_has_resume(self, obj):
        preset = getattr(obj, "has_resume", None)
        if preset is not None:
            return bool(preset)
        return obj.credentials.filter(credential_type="resume", visibility="public").exists()

    def get_availability_summary(self, obj):
        preset = getattr(obj, "availability_summary", None)
        if preset is not None:
            return preset
        if obj.availability.filter(time_block="evening").exists():
            return "Evenings"
        if obj.availability.filter(time_block="flexible").exists():
            return "Flexible"
        return ""


class PublicStudentProfileDetailSerializer(serializers.ModelSerializer):
    profile_skills = ProfileSkillSerializer(many=True, read_only=True)
    contact_methods = serializers.SerializerMethodField()
    availability = AvailabilitySerializer(many=True, read_only=True)
    credentials = serializers.SerializerMethodField()
    reviews_summary = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    reviews_preview = serializers.SerializerMethodField()
    endorsement_count = serializers.SerializerMethodField()
    top_endorsed_skills = serializers.SerializerMethodField()

    class Meta:
        model = StudentProfile
        fields = [
            "id",
            "display_name",
            "major",
            "year",
            "headline",
            "bio",
            "interests",
            "location",
            "profile_picture",
            "open_to_connect",
            "preferred_contact_method",
            "availability_notes",
            "profile_completeness",
            "profile_skills",
            "contact_methods",
            "availability",
            "credentials",
            "reviews_summary",
            "average_rating",
            "review_count",
            "reviews_preview",
            "endorsement_count",
            "top_endorsed_skills",
        ]

    def get_contact_methods(self, obj):
        return ContactMethodSerializer(obj.contact_methods.filter(is_public=True), many=True, context=self.context).data

    def get_credentials(self, obj):
        return CredentialSerializer(obj.credentials.filter(visibility="public"), many=True, context=self.context).data

    def get_reviews_summary(self, obj):
        summary = obj.reviews.aggregate(average_rating=Avg("rating"), review_count=Count("id"))
        return {"average_rating": summary["average_rating"], "review_count": summary["review_count"]}

    def get_average_rating(self, obj):
        value = obj.reviews.aggregate(avg=Avg("rating"))["avg"]
        return round(value, 2) if value is not None else None

    def get_review_count(self, obj):
        return obj.reviews.count()

    def get_reviews_preview(self, obj):
        from interactions.serializers import ReviewSerializer

        return ReviewSerializer(obj.reviews.select_related("reviewer", "related_skill")[:3], many=True, context=self.context).data

    def get_endorsement_count(self, obj):
        return obj.endorsements.count()

    def get_top_endorsed_skills(self, obj):
        rows = (
            obj.endorsements.exclude(skill__isnull=True)
            .values("skill__id", "skill__name")
            .annotate(count=Count("id"))
            .order_by("-count", "skill__name")[:5]
        )
        return [{"id": row["skill__id"], "name": row["skill__name"], "count": row["count"]} for row in rows]
