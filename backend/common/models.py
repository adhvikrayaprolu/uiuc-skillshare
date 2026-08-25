from django.conf import settings
from django.db import models


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
