from datetime import timedelta
import django_rq
from django.core.files.storage import default_storage
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from .models import AvatarDeletion


def schedule_avatar_deletion(name):
    if name:
        AvatarDeletion.objects.get_or_create(name=name)


def enqueue_due_avatar_deletions():
    now=timezone.now()
    with transaction.atomic():
        jobs=list(AvatarDeletion.objects.select_for_update(skip_locked=True).filter(attempts__lt=6, next_attempt_at__lte=now).filter(Q(queued_until__isnull=True)|Q(queued_until__lte=now))[:20])
        for job in jobs:
            job.queued_until=now+timedelta(minutes=3)
            job.save(update_fields=['queued_until'])
    for job in jobs:
        try:
            django_rq.get_queue('default').enqueue(delete_avatar, job.pk, result_ttl=60, failure_ttl=86400)
        except Exception:
            AvatarDeletion.objects.filter(pk=job.pk).update(queued_until=now+timedelta(seconds=30), last_error='queue_unavailable')
    return len(jobs)


def delete_avatar(job_id):
    with transaction.atomic():
        job=AvatarDeletion.objects.select_for_update().filter(pk=job_id).first()
        if not job or job.attempts >= 6 or job.next_attempt_at > timezone.now():
            return
        job.attempts += 1
        job.save(update_fields=['attempts'])
    try:
        default_storage.delete(job.name)
        AvatarDeletion.objects.filter(pk=job_id).delete()
    except Exception:
        AvatarDeletion.objects.filter(pk=job_id).update(last_error='storage_unavailable', queued_until=None, next_attempt_at=timezone.now()+timedelta(seconds=min(30*2**(job.attempts-1),3600)))
