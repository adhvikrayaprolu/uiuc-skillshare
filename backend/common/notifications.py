"""Commit-time notification records and a durable email outbox."""
from datetime import timedelta

import django_rq
from django.conf import settings
from django.core.mail import send_mail
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from profiles.policy import users_blocked
from .models import EmailDelivery, Notification


@transaction.atomic
def notify_request(interaction, kind, actor_id):
    recipient_id = interaction.helper_profile.user_id if actor_id == interaction.seeker_id else interaction.seeker_id
    title = "New help request" if kind == "created" else "New interaction feedback" if kind == "reviewed" or kind.startswith("endorsed-") else f"Help request {kind}"
    record, created = Notification.objects.get_or_create(
        recipient_id=recipient_id, event_key=f"request:{interaction.pk}:{kind}:{interaction.version}",
        defaults={"peer_id": actor_id, "help_request": interaction, "kind": kind, "title": title},
    )
    if created and getattr(getattr(record.recipient, "profile", None), "notification_email_enabled", False):
        EmailDelivery.objects.create(notification=record)
    return record


def visible_notifications(user):
    return Notification.objects.filter(recipient=user, peer__is_active=True, peer__is_student_verified=True).exclude(
        Q(peer_id__in=user.blocked_users.values("blocked_user_id")) |
        Q(peer_id__in=user.blocked_by.values("blocker_id"))
    )


def enqueue_due_emails():
    # Leases recover jobs lost to Redis/worker outages; the database is authoritative.
    now = timezone.now()
    with transaction.atomic():
        rows = list(EmailDelivery.objects.select_for_update(skip_locked=True).filter(
            delivered_at__isnull=True, attempts__lt=6, next_attempt_at__lte=now,
        ).filter(Q(queued_until__isnull=True) | Q(queued_until__lte=now))[:50])
        for row in rows:
            row.queued_until = now + timedelta(minutes=3)
            row.save(update_fields=["queued_until"])
    for row in rows:
        try:
            django_rq.get_queue("default").enqueue(deliver_email, row.pk, result_ttl=60, failure_ttl=86400)
        except Exception:
            EmailDelivery.objects.filter(pk=row.pk).update(queued_until=now+timedelta(seconds=30), last_error="queue_unavailable")
    return len(rows)


@transaction.atomic
def deliver_email(delivery_id):
    row = EmailDelivery.objects.select_for_update(of=("self",)).select_related("notification__recipient__profile", "notification__peer").filter(pk=delivery_id).first()
    if not row or row.delivered_at or row.attempts >= 6 or row.next_attempt_at > timezone.now():
        return
    notification = row.notification
    user = notification.recipient
    row.attempts += 1
    try:
        if user.is_active and user.is_student_verified and getattr(getattr(user, "profile", None), "notification_email_enabled", False) and notification.peer.is_active and not users_blocked(user, notification.peer):
            send_mail(notification.title, f"You have an update in SkillShare. Open {settings.APP_PUBLIC_URL}/requests to view it.", settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        row.delivered_at = timezone.now()  # Includes consent withdrawal; never deliver later.
        row.last_error = ""
    except Exception as error:
        row.last_error = type(error).__name__  # No credentials, addresses or provider response.
        row.next_attempt_at = timezone.now()+timedelta(seconds=min(30*2**(row.attempts-1), 3600))
    row.queued_until = None
    row.save()
