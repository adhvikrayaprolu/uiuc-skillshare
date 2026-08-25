from django.contrib import admin

from .models import Availability, ContactMethod, Credential, ProfileSkill, StudentProfile


class ProfileSkillInline(admin.TabularInline):
    model = ProfileSkill
    extra = 0


class ContactMethodInline(admin.TabularInline):
    model = ContactMethod
    extra = 0


class AvailabilityInline(admin.TabularInline):
    model = Availability
    extra = 0


class CredentialInline(admin.TabularInline):
    model = Credential
    extra = 0


@admin.register(StudentProfile)
class StudentProfileAdmin(admin.ModelAdmin):
    list_display = ("display_name", "user", "major", "year", "open_to_connect", "visibility", "profile_completeness")
    search_fields = ("display_name", "user__email", "major", "headline")
    list_filter = ("year", "open_to_connect", "visibility")
    inlines = [ProfileSkillInline, ContactMethodInline, AvailabilityInline, CredentialInline]


@admin.register(ContactMethod)
class ContactMethodAdmin(admin.ModelAdmin):
    list_display = ("profile", "type", "value", "is_public")
    search_fields = ("profile__display_name", "value")
    list_filter = ("type", "is_public")


@admin.register(Availability)
class AvailabilityAdmin(admin.ModelAdmin):
    list_display = ("profile", "day_of_week", "time_block")
    list_filter = ("day_of_week", "time_block")


@admin.register(Credential)
class CredentialAdmin(admin.ModelAdmin):
    list_display = ("profile", "credential_type", "title", "visibility")
    search_fields = ("profile__display_name", "title", "url")
    list_filter = ("credential_type", "visibility")


@admin.register(ProfileSkill)
class ProfileSkillAdmin(admin.ModelAdmin):
    list_display = ("profile", "skill", "confidence_level", "is_featured")
    search_fields = ("profile__display_name", "skill__name")
    list_filter = ("confidence_level", "is_featured", "skill__category")
