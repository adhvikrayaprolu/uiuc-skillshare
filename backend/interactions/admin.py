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
    list_filter = ("kind", "status", "urgency", "created_at")


@admin.register(Endorsement)
class EndorsementAdmin(admin.ModelAdmin):
    list_display = ("profile", "endorser", "skill", "created_at")
    search_fields = ("profile__display_name", "endorser__email", "skill__name", "note")
    list_filter = ("skill", "created_at")


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ("reason", "reporter", "reported_profile", "reported_user", "reported_review", "status", "created_at")
    search_fields = ("reporter__email", "reported_profile__display_name", "reported_user__email", "description")
    list_filter = ("status", "reason", "created_at")
    readonly_fields = ("reporter", "reported_profile", "reported_user", "reported_review", "reason", "description", "created_at", "updated_at")
    actions = ["mark_reviewed", "dismiss", "suspend_reported_members"]

    def _resolve(self, request, queryset, status, action):
        for report in queryset:
            report.status = status
            report.save(update_fields=["status", "updated_at"])
            ModerationAudit.objects.create(actor=request.user, subject=report_subject(report), action=action)

    @admin.action(description="Mark selected reports reviewed (no action needed)")
    def mark_reviewed(self, request, queryset):
        self._resolve(request, queryset, Report.Status.REVIEWED, "report_reviewed")

    @admin.action(description="Dismiss selected reports")
    def dismiss(self, request, queryset):
        self._resolve(request, queryset, Report.Status.DISMISSED, "report_dismissed")

    @admin.action(description="Suspend the reported members and close these reports")
    def suspend_reported_members(self, request, queryset):
        from accounts.lifecycle import suspend_user
        suspended = 0
        for report in queryset:
            subject = report_subject(report)
            if subject:
                suspended += suspend_user(request.user, subject)
            report.status = Report.Status.ACTION_TAKEN
            report.save(update_fields=["status", "updated_at"])
        self.message_user(request, f"Suspended {suspended} member(s).")


def report_subject(report):
    if report.reported_user_id:
        return report.reported_user
    if report.reported_profile_id:
        return report.reported_profile.user
    if report.reported_review_id:
        return report.reported_review.reviewer
    return None


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
