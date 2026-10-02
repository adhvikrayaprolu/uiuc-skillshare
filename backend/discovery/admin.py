from django.contrib import admin

from .models import ProfileSearchIndex


@admin.register(ProfileSearchIndex)
class ProfileSearchIndexAdmin(admin.ModelAdmin):
    list_display = ("profile", "updated_at")
    search_fields = ("profile__display_name", "profile__user__email", "search_text")
    readonly_fields = ("updated_at",)


from .models import EmbeddingJob
@admin.register(EmbeddingJob)
class EmbeddingJobAdmin(admin.ModelAdmin):
    list_display = ('id', 'attempts', 'next_attempt_at', 'last_error')
    readonly_fields = ('index', 'desired_hash', 'attempts', 'next_attempt_at', 'queued_until', 'last_error')
    def has_add_permission(self, request):
        return False
