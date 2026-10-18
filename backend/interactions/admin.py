from django.contrib import admin

from .models import ModerationAudit, BlockedUser, Endorsement, HelpRequest, Report, Review, SavedProfile


@admin.register(SavedProfile)
class SavedProfileAdmin(admin.ModelAdmin):
    list_display = ("seeker", "saved_profile", "created_at")
    search_fields = ("seeker__email", "saved_profile__display_name", "note")


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ("profile", "reviewer", "rating", "related_skill", "created_at")
    search_fields = ("profile__display_name", "reviewer__email", "comment")
    list_filter = ("rating", "related_skill", "created_at")


@admin.register(HelpRequest)
class HelpRequestAdmin(admin.ModelAdmin):
    list_display = ("topic", "seeker", "helper_profile", "urgency", "status", "created_at")
    search_fields = ("topic", "message", "seeker__email", "helper_profile__display_name")
    list_filter = ("urgency", "status", "created_at")


@admin.register(Endorsement)
class EndorsementAdmin(admin.ModelAdmin):
    list_display = ("profile", "endorser", "skill", "created_at")
    search_fields = ("profile__display_name", "endorser__email", "skill__name", "note")
    list_filter = ("skill", "created_at")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("reason", "reporter", "reported_profile", "reported_user", "reported_review", "status", "created_at")
    search_fields = ("reporter__email", "reported_profile__display_name", "reported_user__email", "description")
    list_filter = ("reason", "status", "created_at")


@admin.register(BlockedUser)
class BlockedUserAdmin(admin.ModelAdmin):
    list_display = ("blocker", "blocked_user", "created_at")
    search_fields = ("blocker__email", "blocked_user__email")


@admin.register(ModerationAudit)
class ModerationAuditAdmin(admin.ModelAdmin):
    list_display = ("actor", "subject", "action", "created_at")
    readonly_fields = ("actor", "subject", "action", "created_at")
    def has_add_permission(self, request): return False
    def has_change_permission(self, request, obj=None): return False
    def has_delete_permission(self, request, obj=None): return False
