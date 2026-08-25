from django.contrib import admin

from .models import AnalyticsEvent


@admin.register(AnalyticsEvent)
class AnalyticsEventAdmin(admin.ModelAdmin):
    list_display = ("event_type", "user", "created_at")
    search_fields = ("user__email", "event_type", "metadata")
    list_filter = ("event_type", "created_at")
    readonly_fields = ("user", "event_type", "metadata", "ip_address", "user_agent", "created_at")
