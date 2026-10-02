from django.contrib import admin

from .models import AnalyticsEvent


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "user", "created_at")
    search_fields = ("user__email", "event_type", "metadata")
    list_filter = ("event_type", "created_at")
    readonly_fields = ("user", "event_type", "metadata", "ip_address", "user_agent", "created_at")


from .models import EmailDelivery, Notification

@admin.register(EmailDelivery)
class EmailDeliveryAdmin(admin.ModelAdmin):
    list_display = ("id", "attempts", "next_attempt_at", "delivered_at", "last_error")
    list_filter = ("delivered_at", "last_error")
    readonly_fields = ("notification", "attempts", "queued_until", "next_attempt_at", "delivered_at", "last_error")
    actions = ["retry_failed"]
    @admin.action(description="Retry exhausted undelivered email jobs")
    def retry_failed(self, request, queryset):
        from django.utils import timezone
        queryset.filter(delivered_at__isnull=True, attempts__gte=6).update(attempts=0, next_attempt_at=timezone.now(), queued_until=None)
    def has_add_permission(self, request):
        return False

@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ("id", "kind", "created_at", "read_at")
    readonly_fields = ("recipient", "peer", "help_request", "event_key", "kind", "title", "read_at", "created_at")
    def has_add_permission(self, request):
        return False
