from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    model = User
    list_display = ("email", "first_name", "last_name", "is_student_verified", "has_completed_onboarding", "is_staff")
    search_fields = ("email", "first_name", "last_name")
    list_filter = ("is_student_verified", "has_completed_onboarding", "is_staff")
    ordering = ("email",)
    fieldsets = (
        (None, {"fields": ("email", "password")}),
        ("Personal info", {"fields": ("first_name", "last_name", "google_sub")}),
        ("Status", {"fields": ("is_student_verified", "has_completed_onboarding", "is_active", "is_staff", "is_superuser")}),
        ("Permissions", {"fields": ("groups", "user_permissions")}),
        ("Important dates", {"fields": ("last_login", "date_joined", "updated_at")}),
    )
    add_fieldsets = ((None, {"classes": ("wide",), "fields": ("email", "password1", "password2")}),)
    actions = ["suspend_accounts", "restore_accounts"]

    @admin.action(description="Suspend selected accounts and revoke sessions")
    def suspend_accounts(self, request, queryset):
        from .lifecycle import revoke_sessions
        from interactions.models import ModerationAudit
        from discovery.models import ProfileSearchIndex
        for user in queryset.exclude(is_superuser=True):
            user.is_active = False
            user.save(update_fields=["is_active"])
            revoke_sessions(user.pk)
            ProfileSearchIndex.objects.filter(profile__user=user).delete()
            ModerationAudit.objects.create(actor=request.user, subject=user, action="suspended")

    @admin.action(description="Restore selected accounts")
    def restore_accounts(self, request, queryset):
        from interactions.models import ModerationAudit
        for user in queryset:
            user.is_active = True
            user.save(update_fields=["is_active"])
            profile = getattr(user, "profile", None)
            if profile:
                from discovery.services import rebuild_profile_search_index
                rebuild_profile_search_index(profile)
            ModerationAudit.objects.create(actor=request.user, subject=user, action="restored")

    readonly_fields = ("date_joined", "updated_at")
