from datetime import timedelta

from django.conf import settings
from django.core.validators import MaxValueValidator, MinValueValidator
from django.db import models
from django.utils import timezone


class SavedProfile(models.Model):
    seeker = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="saved_profiles", on_delete=models.CASCADE)
    saved_profile = models.ForeignKey("profiles.StudentProfile", related_name="saved_by", on_delete=models.CASCADE)
    note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["seeker", "saved_profile"], name="unique_saved_profile")]

    def __str__(self):
        return f"{self.seeker} saved {self.saved_profile}"


class Review(models.Model):
    reviewer = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="written_reviews", on_delete=models.CASCADE)
    profile = models.ForeignKey("profiles.StudentProfile", related_name="reviews", on_delete=models.CASCADE)
    help_request = models.ForeignKey("HelpRequest", null=True, blank=True, on_delete=models.CASCADE, related_name="reviews")
    rating = models.PositiveSmallIntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField()
    related_skill = models.ForeignKey("taxonomy.SkillTag", null=True, blank=True, on_delete=models.SET_NULL)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["help_request", "reviewer"], condition=models.Q(help_request__isnull=False), name="unique_review_per_reviewer")]

    def __str__(self):
        return f"{self.rating}/5 for {self.profile}"


class Endorsement(models.Model):
    endorser = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="given_endorsements", on_delete=models.CASCADE)
    profile = models.ForeignKey("profiles.StudentProfile", related_name="endorsements", on_delete=models.CASCADE)
    skill = models.ForeignKey("taxonomy.SkillTag", null=True, blank=True, on_delete=models.CASCADE)
    help_request = models.ForeignKey("HelpRequest", null=True, blank=True, on_delete=models.CASCADE, related_name="endorsements")
    note = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["endorser", "profile", "skill"], name="unique_endorsement_per_skill")]

    def __str__(self):
        target = self.skill.name if self.skill else "general"
        return f"{self.endorser} endorsed {self.profile} for {target}"


class HelpRequest(models.Model):
    CONTACT_METHOD_CHOICES = [
        ("email", "Email"),
        ("phone", "Phone"),
        ("instagram", "Instagram"),
        ("linkedin", "LinkedIn"),
        ("github", "GitHub"),
        ("portfolio", "Portfolio"),
        ("website", "Website"),
        ("other", "Other"),
    ]

    class Urgency(models.TextChoices):
        LOW = "low", "Low"
        MEDIUM = "medium", "Medium"
        HIGH = "high", "High"

    class Status(models.TextChoices):
        PENDING = "pending", "Pending"
        ACCEPTED = "accepted", "Accepted"
        DECLINED = "declined", "Declined"
        COMPLETED = "completed", "Completed"
        CANCELLED = "cancelled", "Cancelled"
        EXPIRED = "expired", "Expired"

    PENDING_LIFETIME = timedelta(days=14)
    REMINDER_AFTER = timedelta(days=7)
    MAX_PENDING_PER_SEEKER = 5

    class Kind(models.TextChoices):
        HELP = "help", "Help"
        SWAP = "swap", "Swap"

    seeker = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="sent_help_requests", on_delete=models.CASCADE)
    kind = models.CharField(max_length=10, choices=Kind.choices, default=Kind.HELP)
    offered_skill = models.ForeignKey("taxonomy.SkillTag", null=True, blank=True, on_delete=models.SET_NULL, related_name="offered_in_swaps")
    helper_profile = models.ForeignKey("profiles.StudentProfile", related_name="received_help_requests", on_delete=models.CASCADE)
    topic = models.CharField(max_length=180)
    message = models.TextField()
    related_skill = models.ForeignKey("taxonomy.SkillTag", null=True, blank=True, on_delete=models.SET_NULL)
    urgency = models.CharField(max_length=20, choices=Urgency.choices, default=Urgency.MEDIUM)
    preferred_contact_method = models.CharField(
        max_length=20,
        choices=CONTACT_METHOD_CHOICES,
        default="email",
    )
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.PENDING)
    version = models.PositiveIntegerField(default=1)
    idempotency_key = models.UUIDField(null=True, blank=True)
    content_hash = models.CharField(max_length=64, blank=True)
    topic_key = models.CharField(max_length=64, blank=True)
    response_message = models.TextField(blank=True)
    cancel_reason = models.CharField(max_length=300, blank=True)
    accepted_at = models.DateTimeField(null=True, blank=True)
    declined_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField(null=True, blank=True)
    expired_at = models.DateTimeField(null=True, blank=True)
    reminded_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["status", "expires_at"], name="request_status_expiry")]
        constraints = [
            models.UniqueConstraint(fields=["seeker", "idempotency_key"], condition=models.Q(idempotency_key__isnull=False), name="unique_request_submission"),
            models.UniqueConstraint(fields=["seeker", "helper_profile", "topic_key"], condition=models.Q(status__in=["pending", "accepted"]) & ~models.Q(topic_key=""), name="unique_active_help_topic"),
        ]

    def __str__(self):
        return f"{self.topic} -> {self.helper_profile}"

    def feedback_target(self, user):
        """Who `user` may give feedback to and for which skill; help requests are one-way."""
        if user.pk == self.seeker_id:
            return self.helper_profile, self.related_skill
        if self.kind == self.Kind.SWAP and user.pk == self.helper_profile.user_id:
            return getattr(self.seeker, "profile", None), self.offered_skill
        return None, None

    def mark_status_timestamp(self):
        now = timezone.now()
        if self.status == self.Status.ACCEPTED and not self.accepted_at:
            self.accepted_at = now
        elif self.status == self.Status.DECLINED and not self.declined_at:
            self.declined_at = now
        elif self.status == self.Status.COMPLETED and not self.completed_at:
            self.completed_at = now
        elif self.status == self.Status.CANCELLED and not self.cancelled_at:
            self.cancelled_at = now
        elif self.status == self.Status.EXPIRED and not self.expired_at:
            self.expired_at = now

    @property
    def is_past_expiry(self):
        return self.status == self.Status.PENDING and self.expires_at is not None and self.expires_at <= timezone.now()


class Report(models.Model):
    class Reason(models.TextChoices):
        SPAM = "spam", "Spam"
        INAPPROPRIATE_CONTENT = "inappropriate_content", "Inappropriate content"
        HARASSMENT = "harassment", "Harassment"
        FAKE_PROFILE = "fake_profile", "Fake profile"
        MISLEADING_CREDENTIALS = "misleading_credentials", "Misleading credentials"
        OTHER = "other", "Other"

    class Status(models.TextChoices):
        OPEN = "open", "Open"
        REVIEWED = "reviewed", "Reviewed"
        DISMISSED = "dismissed", "Dismissed"
        ACTION_TAKEN = "action_taken", "Action taken"

    reporter = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="submitted_reports", on_delete=models.CASCADE)
    reported_profile = models.ForeignKey("profiles.StudentProfile", null=True, blank=True, related_name="reports", on_delete=models.CASCADE)
    reported_user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="reports_against", on_delete=models.CASCADE)
    reported_review = models.ForeignKey(Review, null=True, blank=True, related_name="reports", on_delete=models.CASCADE)
    reason = models.CharField(max_length=40, choices=Reason.choices)
    description = models.TextField()
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.OPEN)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.reason} report by {self.reporter}"


class BlockedUser(models.Model):
    blocker = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="blocked_users", on_delete=models.CASCADE)
    blocked_user = models.ForeignKey(settings.AUTH_USER_MODEL, related_name="blocked_by", on_delete=models.CASCADE)
    blocked_label = models.CharField(max_length=160, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]
        constraints = [models.UniqueConstraint(fields=["blocker", "blocked_user"], name="unique_blocked_user")]

    def __str__(self):
        return f"{self.blocker} blocked {self.blocked_user}"


class ModerationAudit(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="moderation_actions")
    subject = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL, related_name="moderation_history")
    action = models.CharField(max_length=40)
    created_at = models.DateTimeField(auto_now_add=True)
