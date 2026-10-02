from django.db import models
from django.utils import timezone
from pgvector.django import VectorField


class ProfileSearchIndex(models.Model):
    profile = models.OneToOneField("profiles.StudentProfile", related_name="search_index", on_delete=models.CASCADE)
    search_text = models.TextField()
    extracted_keywords = models.JSONField(default=list, blank=True)
    suggested_skill_names = models.JSONField(default=list, blank=True)
    vector = VectorField(dimensions=1536, null=True, blank=True)
    content_hash = models.CharField(max_length=64, blank=True)
    embedding_hash = models.CharField(max_length=64, blank=True)
    embedding_model = models.CharField(max_length=80, blank=True)
    embedding_version = models.CharField(max_length=80, blank=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Search index for {self.profile}"


class EmbeddingJob(models.Model):
    index = models.OneToOneField(ProfileSearchIndex, on_delete=models.CASCADE, related_name='embedding_job')
    desired_hash = models.CharField(max_length=64)
    attempts = models.PositiveSmallIntegerField(default=0)
    next_attempt_at = models.DateTimeField(default=timezone.now)
    queued_until = models.DateTimeField(null=True, blank=True)
    last_error = models.CharField(max_length=80, blank=True)
    processing_until = models.DateTimeField(null=True, blank=True)
