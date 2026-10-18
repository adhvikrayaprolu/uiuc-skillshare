"""Day-7 reminders and day-14 expiry for requests that never got a reply."""
from django.db import transaction
from django.utils import timezone

from .models import HelpRequest

BATCH = 100


def remind_pending(now=None):
    now = now or timezone.now()
    with transaction.atomic():
        rows = list(HelpRequest.objects.select_for_update(skip_locked=True).select_related("helper_profile").filter(
            status=HelpRequest.Status.PENDING, reminded_at__isnull=True,
            created_at__lte=now-HelpRequest.REMINDER_AFTER, expires_at__gt=now,
        )[:BATCH])
        from common.notifications import notify_request
        for row in rows:
            row.reminded_at = now
            row.save(update_fields=["reminded_at", "updated_at"])
            notify_request(row, "reminder", row.seeker_id)
    return len(rows)


def expire_pending(now=None):
    # Row locks plus the version bump make a racing accept fail with a 409 instead of resurrecting the request.
    now = now or timezone.now()
    with transaction.atomic():
        rows = list(HelpRequest.objects.select_for_update(skip_locked=True).select_related("helper_profile").filter(
            status=HelpRequest.Status.PENDING, expires_at__lte=now,
        )[:BATCH])
        from common.notifications import notify_request
        for row in rows:
            row.status = HelpRequest.Status.EXPIRED
            row.expired_at = now
            row.version += 1
            row.save(update_fields=["status", "expired_at", "version", "updated_at"])
            notify_request(row, "expired", row.seeker_id)
            notify_request(row, "expired", row.helper_profile.user_id)
    return len(rows)


def process_pending_requests(now=None):
    return remind_pending(now), expire_pending(now)
