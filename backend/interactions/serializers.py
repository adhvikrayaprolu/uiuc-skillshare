from rest_framework import serializers

from profiles.serializers import PublicStudentProfileListSerializer
from .models import BlockedUser, Endorsement, HelpRequest, Report, Review, SavedProfile


from profiles.policy import can_share_contacts, can_view_profile, users_blocked


class SavedProfileSerializer(serializers.ModelSerializer):
    saved_profile_detail = PublicStudentProfileListSerializer(source="saved_profile", read_only=True)

    class Meta:
        model = SavedProfile
        fields = ["id", "saved_profile", "saved_profile_detail", "note", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_saved_profile(self, profile):
        if profile.user_id == self.context["request"].user.id:
            raise serializers.ValidationError("You cannot save your own profile.")
        if not can_view_profile(self.context["request"].user, profile):
            raise serializers.ValidationError("This profile is unavailable.")
        return profile

    def create(self, validated_data):
        from common.analytics import track_event

        saved = SavedProfile.objects.create(seeker=self.context["request"].user, **validated_data)
        track_event(self.context["request"].user, "profile_saved", {"profile_id": saved.saved_profile_id}, self.context["request"])
        return saved


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.SerializerMethodField()
    reviewer_profile_id = serializers.SerializerMethodField()

    class Meta:
        model = Review
        fields = ["id", "reviewer", "reviewer_name", "reviewer_profile_id", "profile", "help_request", "rating", "comment", "related_skill", "created_at", "updated_at"]
        read_only_fields = ["id", "reviewer", "profile", "created_at", "updated_at"]

    def get_reviewer_name(self, obj):
        return f"{obj.reviewer.first_name} {obj.reviewer.last_name}".strip() or "Member"

    def get_reviewer_profile_id(self, obj):
        profile = getattr(obj.reviewer, "profile", None)
        return profile.id if profile and can_view_profile(self.context["request"].user, profile) else None

    def validate_rating(self, value):
        if value < 1 or value > 5:
            raise serializers.ValidationError("Rating must be 1 through 5.")
        return value

    def validate(self, attrs):
        profile = self.context.get("profile") or getattr(self.instance, "profile", None)
        if profile and profile.user_id == self.context["request"].user.id:
            raise serializers.ValidationError("You cannot review your own profile.")
        from .lifecycle import validate_feedback
        validate_feedback(attrs, self.context, self.instance)
        return attrs

    def create(self, validated_data):
        from common.analytics import track_event

        review = Review.objects.create(reviewer=self.context["request"].user, profile=self.context["profile"], **validated_data)
        track_event(self.context["request"].user, "review_created", {"profile_id": review.profile_id, "review_id": review.id}, self.context["request"])
        from common.notifications import notify_request
        notify_request(review.help_request, "reviewed", review.reviewer_id)
        return review


class EndorsementSerializer(serializers.ModelSerializer):
    endorser_name = serializers.SerializerMethodField()
    endorser_profile_id = serializers.SerializerMethodField()
    skill_name = serializers.CharField(source="skill.name", read_only=True)

    class Meta:
        model = Endorsement
        fields = ["id", "endorser", "endorser_name", "endorser_profile_id", "profile", "help_request", "skill", "skill_name", "note", "created_at"]
        read_only_fields = ["id", "endorser", "profile", "created_at"]

    def get_endorser_name(self, obj):
        return f"{obj.endorser.first_name} {obj.endorser.last_name}".strip() or "Member"

    def get_endorser_profile_id(self, obj):
        profile = getattr(obj.endorser, "profile", None)
        return profile.id if profile and can_view_profile(self.context["request"].user, profile) else None

    def validate(self, attrs):
        profile = self.context.get("profile")
        request = self.context["request"]
        if profile and profile.user_id == request.user.id:
            raise serializers.ValidationError("You cannot endorse your own profile.")
        skill = attrs.get("skill")
        if skill and profile and not profile.profile_skills.filter(skill=skill).exists():
            raise serializers.ValidationError("You can only endorse skills listed on this profile.")
        if profile and Endorsement.objects.filter(endorser=request.user, profile=profile, skill=skill).exists():
            raise serializers.ValidationError("You have already endorsed this profile for that skill.")
        from .lifecycle import validate_feedback
        validate_feedback(attrs, self.context, self.instance, endorsement=True)
        return attrs

    def create(self, validated_data):
        from common.analytics import track_event

        endorsement = Endorsement.objects.create(endorser=self.context["request"].user, profile=self.context["profile"], **validated_data)
        track_event(self.context["request"].user, "endorsement_created", {"profile_id": endorsement.profile_id, "endorsement_id": endorsement.id}, self.context["request"])
        from common.notifications import notify_request
        notify_request(endorsement.help_request, f"endorsed-{endorsement.skill_id}", endorsement.endorser_id)
        return endorsement


class HelpRequestSerializer(serializers.ModelSerializer):
    seeker_email = serializers.SerializerMethodField()
    helper_display_name = serializers.SerializerMethodField()
    seeker_display_name = serializers.SerializerMethodField()
    seeker_profile_id = serializers.SerializerMethodField()
    seeker_profile_detail = serializers.SerializerMethodField()
    helper_profile_detail = serializers.SerializerMethodField()
    related_skill_name = serializers.SerializerMethodField()
    helper_contact_methods = serializers.SerializerMethodField()
    seeker_contact_methods = serializers.SerializerMethodField()
    next_step = serializers.SerializerMethodField()

    class Meta:
        model = HelpRequest
        fields = [
            "id",
            "seeker",
            "seeker_email",
            "seeker_display_name",
            "seeker_profile_id",
            "seeker_profile_detail",
            "helper_profile",
            "helper_display_name",
            "helper_profile_detail",
            "topic",
            "message",
            "related_skill",
            "related_skill_name",
            "urgency",
            "preferred_contact_method",
            "version",
            "idempotency_key",
            "status",
            "response_message",
            "helper_contact_methods",
            "seeker_contact_methods",
            "next_step",
            "accepted_at",
            "declined_at",
            "completed_at",
            "cancelled_at",
            "created_at",
            "updated_at",
        ]
        read_only_fields = ["id", "seeker", "accepted_at", "declined_at", "completed_at", "cancelled_at", "created_at", "updated_at"]

    def get_helper_display_name(self, obj):
        return obj.helper_profile.display_name if can_view_profile(self.context["request"].user, obj.helper_profile) else "Unavailable member"

    def get_helper_profile_detail(self, obj):
        if not can_view_profile(self.context["request"].user, obj.helper_profile):
            return None
        return PublicStudentProfileListSerializer(obj.helper_profile, context=self.context).data

    def get_seeker_email(self, obj):
        return None

    def get_seeker_display_name(self, obj):
        profile = getattr(obj.seeker, "profile", None)
        if not profile or not can_view_profile(self.context["request"].user, profile):
            return "Unavailable member"
        full_name = f"{obj.seeker.first_name} {obj.seeker.last_name}".strip()
        return full_name or "Member"

    def get_seeker_profile_id(self, obj):
        profile = getattr(obj.seeker, "profile", None)
        return profile.id if profile and can_view_profile(self.context["request"].user, profile) else None

    def get_seeker_profile_detail(self, obj):
        profile = getattr(obj.seeker, "profile", None)
        if not profile or not can_view_profile(self.context["request"].user, profile):
            return None
        return PublicStudentProfileListSerializer(profile, context=self.context).data

    def get_related_skill_name(self, obj):
        return obj.related_skill.name if obj.related_skill_id else None

    def get_helper_contact_methods(self, obj):
        request = self.context.get("request")
        if not request or request.user.id not in {obj.seeker_id, obj.helper_profile.user_id}:
            return []
        if obj.status not in {HelpRequest.Status.ACCEPTED, HelpRequest.Status.COMPLETED}:
            return []
        if not can_share_contacts(request.user, obj.helper_profile):
            return []
        from profiles.serializers import ContactMethodSerializer

        return ContactMethodSerializer(obj.helper_profile.contact_methods.filter(is_public=True), many=True, context=self.context).data

    def get_seeker_contact_methods(self, obj):
        request = self.context.get("request")
        if not request or request.user.id not in {obj.seeker_id, obj.helper_profile.user_id}:
            return []
        if obj.status not in {HelpRequest.Status.ACCEPTED, HelpRequest.Status.COMPLETED}:
            return []
        seeker_profile = getattr(obj.seeker, "profile", None)
        if not seeker_profile or not can_share_contacts(request.user, seeker_profile):
            return []
        from profiles.serializers import ContactMethodSerializer

        return ContactMethodSerializer(seeker_profile.contact_methods.filter(is_public=True), many=True, context=self.context).data

    def get_next_step(self, obj):
        if obj.status == HelpRequest.Status.ACCEPTED:
            return "Request accepted. Coordinate directly using the shared contact method."
        return ""

    def validate_helper_profile(self, profile):
        if profile.user_id == self.context["request"].user.id:
            raise serializers.ValidationError("You cannot send a help request to yourself.")
        if not can_view_profile(self.context["request"].user, profile) or not profile.open_to_connect:
            raise serializers.ValidationError("You can only send help requests to public, open-to-connect profiles.")
        if users_blocked(self.context["request"].user, profile.user):
            raise serializers.ValidationError("You cannot send a help request because one participant has blocked the other.")
        return profile

    def validate(self, attrs):
        request = self.context["request"]
        if not self.instance:
            if attrs.get("status", "pending") != "pending" or attrs.get("response_message"):
                raise serializers.ValidationError("New requests must start pending without a helper response.")
        else:
            immutable = set(self.initial_data) - {"status", "response_message", "version"}
            if immutable:
                raise serializers.ValidationError({field: "Cannot change a submitted request." for field in immutable})
            if users_blocked(request.user, self.instance.helper_profile.user if request.user == self.instance.seeker else self.instance.seeker):
                raise serializers.ValidationError("This connection is unavailable.")
            if "response_message" in attrs and self.instance.helper_profile.user_id != request.user.id:
                raise serializers.ValidationError("Only the helper can write a response.")
            new_status = attrs.get("status")
            if not new_status or new_status == self.instance.status:
                return attrs
            allowed = {
                "pending": {"accepted", "declined", "cancelled"},
                "accepted": {"completed", "cancelled"},
                "declined": set(),
                "cancelled": set(),
                "completed": set(),
            }
            if new_status not in allowed[self.instance.status]:
                raise serializers.ValidationError(f"Cannot transition help request from {self.instance.status} to {new_status}.")
            if new_status == "cancelled" and self.instance.seeker_id != request.user.id:
                raise serializers.ValidationError("Only the seeker can cancel this request.")
            helper_statuses = {"accepted", "declined"}
            if new_status in helper_statuses and self.instance.helper_profile.user_id != request.user.id:
                raise serializers.ValidationError("Only the helper can accept or decline this request.")
            if new_status == "completed" and request.user.id not in {self.instance.seeker_id, self.instance.helper_profile.user_id}:
                raise serializers.ValidationError("Only participants can complete this request.")
        return attrs

    def create(self, validated_data):
        from .lifecycle import create_request
        return create_request(self, validated_data)

    def update(self, instance, validated_data):
        from .lifecycle import transition_request
        return transition_request(self, instance, validated_data)


class ReportSerializer(serializers.ModelSerializer):
    class Meta:
        model = Report
        fields = ["id", "reported_profile", "reported_user", "reported_review", "reason", "description", "status", "created_at", "updated_at"]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def validate(self, attrs):
        request = self.context["request"]
        if not any(attrs.get(field) for field in ["reported_profile", "reported_user", "reported_review"]):
            raise serializers.ValidationError("Report must target a profile, user, or review.")
        if attrs.get("reported_user") == request.user:
            raise serializers.ValidationError("You cannot report yourself.")
        if attrs.get("reported_profile") and attrs["reported_profile"].user_id == request.user.id:
            raise serializers.ValidationError("You cannot report your own profile.")
        if attrs.get("reported_review") and attrs["reported_review"].reviewer_id == request.user.id:
            raise serializers.ValidationError("You cannot report your own review.")
        return attrs

    def create(self, validated_data):
        return Report.objects.create(reporter=self.context["request"].user, **validated_data)


class BlockedUserSerializer(serializers.ModelSerializer):
    blocked_label = serializers.CharField(read_only=True)

    class Meta:
        model = BlockedUser
        fields = ["id", "blocked_user", "blocked_label", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_blocked_user(self, blocked_user):
        if blocked_user == self.context["request"].user:
            raise serializers.ValidationError("You cannot block yourself.")
        return blocked_user

    def create(self, validated_data):
        from django.db import transaction
        from django.db.models import Q
        from django.utils import timezone
        from accounts.models import User
        blocker = self.context["request"].user
        blocked = validated_data["blocked_user"]
        with transaction.atomic():
            list(User.objects.select_for_update().filter(pk__in=[blocker.pk, blocked.pk]).order_by("pk"))
            profile = getattr(blocked, "profile", None)
            label = profile.display_name if profile and can_view_profile(blocker, profile) else "Unavailable member"
            record, _ = BlockedUser.objects.get_or_create(blocker=blocker, blocked_user=blocked, defaults={"blocked_label": label})
            requests = HelpRequest.objects.select_for_update().filter(Q(seeker=blocker, helper_profile__user=blocked) | Q(seeker=blocked, helper_profile__user=blocker))
            for help_request in requests:
                if help_request.status in {"pending", "accepted"}:
                    help_request.status = "cancelled"
                    help_request.cancelled_at = timezone.now()
                    help_request.version += 1
                help_request.topic, help_request.message, help_request.response_message = "Connection removed", "", ""
                help_request.save()
            return record
