import hashlib
import re
from datetime import timedelta
import django_rq
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from . import ai
from .models import EmbeddingJob, ProfileSearchIndex


def embedding_text(text):
    text = re.sub(r'[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}', '[email omitted]', text)
    text = re.sub(r'(?<!\w)\+?\d[\d(). -]{7,}\d(?!\w)', '[phone omitted]', text)
    return re.sub(r'https?://\S+', '[link omitted]', text).strip()


def content_hash(text):
    text = embedding_text(text)
    return hashlib.sha256(f'{ai.MODEL}:{ai.VERSION}:{text}'.encode()).hexdigest()


def sync_embedding_job(index, profile):
    digest = content_hash(index.search_text)
    if not profile.embedding_consent:
        ProfileSearchIndex.objects.filter(pk=index.pk).update(vector=None, embedding_model='', embedding_version='', embedding_hash='', content_hash=digest)
        EmbeddingJob.objects.filter(index=index).delete()
        return
    stale = index.embedding_hash != digest or index.embedding_model != ai.MODEL or index.embedding_version != ai.VERSION
    ProfileSearchIndex.objects.filter(pk=index.pk).update(content_hash=digest, **({'vector': None, 'embedding_hash': '', 'embedding_model': '', 'embedding_version': ''} if stale else {}))
    if stale:
        job, created = EmbeddingJob.objects.get_or_create(index=index, defaults={'desired_hash': digest})
        if not created and job.desired_hash != digest:
            job.desired_hash = digest; job.attempts = 0; job.queued_until = None; job.processing_until = None; job.last_error = ''; job.next_attempt_at = timezone.now(); job.save()


def enqueue_due_embeddings():
    if ai.disabled_reason():
        return 0
    now = timezone.now()
    with transaction.atomic():
        jobs = list(EmbeddingJob.objects.select_for_update(skip_locked=True).filter(attempts__lt=6, next_attempt_at__lte=now).filter(Q(queued_until__isnull=True)|Q(queued_until__lte=now))[:20])
        for job in jobs:
            job.queued_until = now+timedelta(minutes=3); job.save(update_fields=['queued_until'])
    for job in jobs:
        try:
            django_rq.get_queue('default').enqueue(update_embedding, job.pk, result_ttl=60, failure_ttl=86400)
        except Exception:
            EmbeddingJob.objects.filter(pk=job.pk).update(queued_until=now+timedelta(seconds=30), last_error='queue_unavailable')
    return len(jobs)


def update_embedding(job_id):
    if ai.disabled_reason():
        return
    with transaction.atomic():
        job = EmbeddingJob.objects.select_for_update(of=('self',)).select_related('index__profile__user').filter(pk=job_id).first()
        now = timezone.now()
        if not job or job.attempts >= 6 or job.next_attempt_at > now or job.processing_until and job.processing_until > now:
            return
        job.attempts += 1
        job.processing_until = now+timedelta(seconds=30)
        job.save(update_fields=['attempts', 'processing_until'])
    profile = job.index.profile
    if not profile.embedding_consent or profile.visibility != 'public' or not profile.user.is_active or not profile.user.is_student_verified or profile.user.is_demo:
        EmbeddingJob.objects.filter(pk=job_id).delete()
        return
    try:
        vector = ai.get_embedding(embedding_text(job.index.search_text))
        # Recheck after the provider call: deletion, privacy, consent and newer edits win.
        with transaction.atomic():
            index = ProfileSearchIndex.objects.select_for_update(of=('self',)).select_related('profile__user').filter(pk=job.index_id).first()
            if not index:
                return
            current = index.profile
            if index.content_hash != job.desired_hash or not current.embedding_consent or current.visibility != 'public' or not current.user.is_active or not current.user.is_student_verified or current.user.is_demo:
                return
            index.vector = vector; index.embedding_model = ai.MODEL; index.embedding_version = ai.VERSION; index.embedding_hash = job.desired_hash
            index.save(update_fields=['vector','embedding_model','embedding_version','embedding_hash'])
            EmbeddingJob.objects.filter(pk=job_id, desired_hash=job.desired_hash).delete()
    except ai.SemanticUnavailable as error:
        with transaction.atomic():
            current = EmbeddingJob.objects.select_for_update().filter(pk=job_id, desired_hash=job.desired_hash).first()
            if current:
                current.processing_until = None; current.last_error = str(error)[:80]; current.queued_until = None
                current.next_attempt_at = timezone.now()+timedelta(seconds=min(30*2**(current.attempts-1),3600)); current.save()
