from django.db import models


class ProfileSearchIndex(models.Model):
    profile = models.OneToOneField("profiles.StudentProfile", related_name="search_index", on_delete=models.CASCADE)
    search_text = models.TextField()
    extracted_keywords = models.JSONField(default=list, blank=True)
    suggested_skill_names = models.JSONField(default=list, blank=True)
    embedding = models.JSONField(null=True, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Search index for {self.profile}"
