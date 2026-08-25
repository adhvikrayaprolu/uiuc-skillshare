from django.contrib import admin

from .models import ProfileSearchIndex


@admin.register(ProfileSearchIndex)
class ProfileSearchIndexAdmin(admin.ModelAdmin):
    list_display = ("profile", "updated_at")
    search_fields = ("profile__display_name", "profile__user__email", "search_text")
    readonly_fields = ("updated_at",)
