from django.conf import settings
from django.db import models
from django.utils import timezone


class AnalyticsEvent(models.Model):
    class EventType(models.TextChoices):
        PROFILE_CREATED = "profile_created", "Profile created"
        PROFILE_UPDATED = "profile_updated", "Profile updated"
        SEARCH_PERFORMED = "search_performed", "Search performed"
        PROFILE_VIEWED = "profile_viewed", "Profile viewed"
        CONTACT_CLICKED = "contact_clicked", "Contact clicked"
        PROFILE_SAVED = "profile_saved", "Profile saved"
        HELP_REQUEST_CREATED = "help_request_created", "Help request created"
        REVIEW_CREATED = "review_created", "Review created"
        ENDORSEMENT_CREATED = "endorsement_created", "Endorsement created"
        MATCHES_SHOWN = "matches_shown", "First matches shown"

    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, related_name="analytics_events", on_delete=models.SET_NULL)
    event_type = models.CharField(max_length=40, choices=EventType.choices)
    metadata = models.JSONField(default=dict, blank=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self):
        return f"{self.event_type} @ {self.created_at:%Y-%m-%d %H:%M}"


class Notification(models.Model):
    recipient = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications")
    peer = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="peer_notifications")
    help_request = models.ForeignKey("interactions.HelpRequest", null=True, blank=True, on_delete=models.CASCADE, related_name="notifications")
    profile = models.ForeignKey("profiles.StudentProfile", null=True, blank=True, on_delete=models.CASCADE, related_name="alert_notifications")
    event_key = models.CharField(max_length=180)
    kind = models.CharField(max_length=24)
    title = models.CharField(max_length=120)
    read_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def href(self):
        if self.help_request_id:
            return f"/requests/{self.help_request_id}"
        return f"/profiles/{self.profile_id}" if self.profile_id else "/home"

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [models.UniqueConstraint(fields=["recipient", "event_key"], name="unique_notification_event")]
        indexes = [models.Index(fields=["recipient", "read_at"])]


class EmailDelivery(models.Model):
    notification = models.OneToOneField(Notification, on_delete=models.CASCADE, related_name="delivery")
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    queued_until = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=80, blank=True)
    class Meta:
        indexes = [models.Index(fields=["delivered_at", "next_attempt_at"])]


class ClientError(models.Model):
    """Grouped browser errors. Stores no user, IP address, query string or request body."""
    fingerprint = models.CharField(max_length=64, unique=True)
    message = models.CharField(max_length=300)
    source = models.CharField(max_length=200, blank=True)
    path = models.CharField(max_length=200, blank=True)
    release = models.CharField(max_length=40, blank=True)
    count = models.PositiveIntegerField(default=1)
    first_seen = models.DateTimeField(auto_now_add=True)
    last_seen = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ["-last_seen"]

    def __str__(self):
        return f"{self.message[:60]} ×{self.count}"


class AvatarDeletion(models.Model):
    """Independent outbox: deletion survives the account that owned an avatar."""
    name = models.CharField(max_length=255, unique=True)
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    queued_until = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=80, blank=True)
