from django.contrib import admin

from .models import SkillCategory, SkillTag


@admin.register(SkillCategory)
class SkillCategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "slug")
    search_fields = ("name", "description")
    prepopulated_fields = {"slug": ("name",)}


@admin.register(SkillTag)
class SkillTagAdmin(admin.ModelAdmin):
    list_display = ("name", "category", "is_approved")
    search_fields = ("name", "category__name")
    list_filter = ("category", "is_approved")
    prepopulated_fields = {"slug": ("name",)}
