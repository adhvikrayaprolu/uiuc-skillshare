from django.db.models import Avg, Count
from rest_framework import serializers

from taxonomy.serializers import SkillTagSerializer
from taxonomy.models import SkillTag
from django.core.validators import validate_email, URLValidator
from django.core.exceptions import ValidationError as DjangoValidationError
import re
from .models import Availability, ContactMethod, Credential, ProfileSkill, StudentProfile


class ContactMethodSerializer(serializers.ModelSerializer):
    def validate(self, attrs):
        kind = attrs.get("type", getattr(self.instance, "type", ""))
        value = attrs.get("value", getattr(self.instance, "value", "")).strip()
        try:
            if kind == "email": validate_email(value)
            elif kind == "phone" and not re.fullmatch(r"\+?[0-9() .-]{7,25}", value): raise DjangoValidationError("Use a valid phone number.")
            elif kind == "instagram" and not re.fullmatch(r"@?[A-Za-z0-9_.]{1,30}", value): raise DjangoValidationError("Use an Instagram handle.")
            elif kind not in {"email", "phone", "instagram"}: URLValidator(schemes=["http", "https"])(value)
        except DjangoValidationError as error:
            raise serializers.ValidationError({"value": error.messages})
        attrs["value"] = value
        return attrs

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

    def validate(self, attrs):
        if attrs.get("file"):
            raise serializers.ValidationError({"file": "Document uploads are deferred. Add an evidence link instead."})
        url = attrs.get("url", getattr(self.instance, "url", ""))
        if url:
            try: URLValidator(schemes=["http", "https"])(url)
            except DjangoValidationError: raise serializers.ValidationError({"url": "Use an HTTP or HTTPS link."})
        return attrs


class ProfileSkillSerializer(serializers.ModelSerializer):
    skill = serializers.PrimaryKeyRelatedField(queryset=SkillTag.objects.filter(is_approved=True))
    skill_detail = SkillTagSerializer(source="skill", read_only=True)

    class Meta:
        model = ProfileSkill
        fields = ["id", "skill", "skill_detail", "confidence_level", "description", "is_featured", "created_at", "updated_at"]
        read_only_fields = ["id", "created_at", "updated_at"]


class StudentProfileSerializer(serializers.ModelSerializer):
    learning_goals = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    profile_picture = serializers.SerializerMethodField()

    def get_profile_picture(self, obj) -> str | None:
        return f"/api/profiles/{obj.pk}/avatar/" if obj.profile_picture else None

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
            "learning_goals",
            "learning_goal_notes",
            "share_contacts",
            "embedding_consent", "notification_email_enabled",
            "availability_confirmed_at",
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
    learning_goals = serializers.PrimaryKeyRelatedField(many=True, queryset=SkillTag.objects.filter(is_approved=True), required=False)
    profile_picture = serializers.ImageField(read_only=True)
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
            "learning_goals",
            "learning_goal_notes",
            "share_contacts",
            "embedding_consent", "notification_email_enabled",
            "availability_confirmed_at",
            "location",
            "profile_picture",
            "open_to_connect",
            "preferred_contact_method",
            "availability_notes",
            "visibility",
            "profile_completeness",
        ]
        read_only_fields = ["id", "profile_completeness", "availability_confirmed_at"]

    def validate(self, attrs):
        request = self.context["request"]
        if request.method == "POST" and StudentProfile.objects.filter(user=request.user).exists():
            raise serializers.ValidationError("User cannot create more than one StudentProfile.")
        return attrs

    def create(self, validated_data):
        validated_data.setdefault("visibility", "private")
        goals = validated_data.pop("learning_goals", [])
        profile = StudentProfile.objects.create(user=self.context["request"].user, **validated_data)
        profile.learning_goals.set(goals)
        profile.update_profile_completeness()
        profile.update_onboarding()
        return profile

    def update(self, instance, validated_data):
        from django.utils import timezone
        if "open_to_connect" in validated_data or "availability_notes" in validated_data:
            validated_data["availability_confirmed_at"] = timezone.now()
        profile = super().update(instance, validated_data)
        profile.update_profile_completeness()
        profile.update_onboarding()
        return profile


class FeedbackPolicyMixin:
    def _reviews(self, obj):
        from .policy import visible_feedback
        return visible_feedback(obj.reviews.all(), self.context["request"].user)

    def _endorsements(self, obj):
        from .policy import visible_feedback
        return visible_feedback(obj.endorsements.all(), self.context["request"].user, "endorser")


class PublicStudentProfileListSerializer(FeedbackPolicyMixin, serializers.ModelSerializer):
    profile_picture = serializers.SerializerMethodField()

    def get_profile_picture(self, obj) -> str | None:
        return f"/api/profiles/{obj.pk}/avatar/" if obj.profile_picture else None

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

    def get_top_skills(self, obj) -> list[str]:
        skills = getattr(obj, "offered_skills", None)
        if skills is None: skills = list(obj.profile_skills.select_related("skill").order_by("-is_featured", "id"))
        return [ps.skill.name for ps in sorted(skills, key=lambda ps: (not ps.is_featured, ps.pk))[:3]]

    def get_top_categories(self, obj) -> list[str]:
        seen = []
        skills = getattr(obj, "offered_skills", None)
        if skills is None: skills = obj.profile_skills.select_related("skill__category").order_by("-is_featured", "id")
        for ps in skills:
            name = ps.skill.category.name
            if name not in seen:
                seen.append(name)
            if len(seen) == 3:
                break
        return seen

    def get_average_rating(self, obj) -> float | None:
        value = getattr(obj, "average_rating", None)
        if not hasattr(obj, "average_rating"):
            value = self._reviews(obj).aggregate(avg=Avg("rating"))["avg"]
        return round(value, 2) if value is not None else None

    def get_review_count(self, obj) -> int:
        value = getattr(obj, "review_count", None)
        return value if value is not None else self._reviews(obj).count()

    def get_match_score(self, obj) -> float | None:
        return getattr(obj, "match_score", None)

    def get_match_reasons(self, obj) -> list[str]:
        return getattr(obj, "match_reasons", [])

    def get_semantic_reasons(self, obj) -> list[str]:
        return getattr(obj, "semantic_reasons", [])

    def get_has_resume(self, obj) -> bool:
        preset = getattr(obj, "has_resume", None)
        if preset is not None:
            return bool(preset)
        return obj.credentials.filter(credential_type="resume", visibility="public").exists()

    def get_availability_summary(self, obj) -> str:
        preset = getattr(obj, "availability_summary", None)
        if preset is not None:
            return preset
        if obj.availability.filter(time_block="evening").exists():
            return "Evenings"
        if obj.availability.filter(time_block="flexible").exists():
            return "Flexible"
        return ""


class PublicStudentProfileDetailSerializer(FeedbackPolicyMixin, serializers.ModelSerializer):
    user_id = serializers.IntegerField(read_only=True)
    profile_picture = serializers.SerializerMethodField()

    def get_profile_picture(self, obj) -> str | None:
        return f"/api/profiles/{obj.pk}/avatar/" if obj.profile_picture else None

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
            "user_id",
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

    def get_contact_methods(self, obj) -> list[dict]:
        from .policy import can_share_contacts
        if not can_share_contacts(self.context["request"].user, obj):
            return []
        return ContactMethodSerializer(obj.contact_methods.filter(is_public=True), many=True, context=self.context).data

    def get_credentials(self, obj) -> list[dict]:
        return CredentialSerializer(obj.credentials.filter(visibility="public"), many=True, context=self.context).data

    def get_reviews_summary(self, obj) -> dict:
        summary = self._reviews(obj).aggregate(average_rating=Avg("rating"), review_count=Count("id"))
        return {"average_rating": summary["average_rating"], "review_count": summary["review_count"]}

    def get_average_rating(self, obj) -> float | None:
        value = self._reviews(obj).aggregate(avg=Avg("rating"))["avg"]
        return round(value, 2) if value is not None else None

    def get_review_count(self, obj) -> int:
        return self._reviews(obj).count()

    def get_reviews_preview(self, obj) -> list[dict]:
        from interactions.serializers import ReviewSerializer

        from .policy import visible_profiles
        allowed = visible_profiles(StudentProfile.objects.all(), self.context["request"].user).values("user_id")
        return ReviewSerializer(self._reviews(obj).filter(reviewer_id__in=allowed).select_related("reviewer", "related_skill")[:3], many=True, context=self.context).data

    def get_endorsement_count(self, obj) -> int:
        return self._endorsements(obj).count()

    def get_top_endorsed_skills(self, obj) -> list[dict]:
        rows = (
            self._endorsements(obj).exclude(skill__isnull=True)
            .values("skill__id", "skill__name")
            .annotate(count=Count("id"))
            .order_by("-count", "skill__name")[:5]
        )
        return [{"id": row["skill__id"], "name": row["skill__name"], "count": row["count"]} for row in rows]


class ProfileAggregateSerializer(serializers.Serializer):
    profile = serializers.DictField()
    skills = ProfileSkillSerializer(many=True, max_length=100, required=False)
    availability = AvailabilitySerializer(many=True, max_length=100, required=False)
    contacts = ContactMethodSerializer(many=True, max_length=100, required=False)
    credentials = CredentialSerializer(many=True, max_length=100, required=False)

    def validate_skills(self, rows):
        ids = [row["skill"].id for row in rows]
        if len(ids) != len(set(ids)):
            raise serializers.ValidationError("Choose each skill once.")
        return rows
