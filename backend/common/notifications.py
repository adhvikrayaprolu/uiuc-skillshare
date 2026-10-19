"""Commit-time notification records and a durable email outbox."""
from datetime import timedelta

import django_rq
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from profiles.policy import users_blocked
from .emails import send_notification_email
from .models import EmailDelivery, Notification


@transaction.atomic
def notify_request(interaction, kind, actor_id):
    recipient_id = interaction.helper_profile.user_id if actor_id == interaction.seeker_id else interaction.seeker_id
    swap = getattr(interaction, "kind", "help") == "swap"
    created_title = "New swap proposal" if swap else "New help request"
    if kind == "created":
        title = created_title
    elif kind == "reviewed" or kind.startswith("endorsed-"):
        title = "New interaction feedback"
    elif kind == "reminder":
        title = f"A {'swap proposal' if swap else 'request'} is waiting for your reply"
    else:
        title = f"{'Swap' if swap else 'Help request'} {kind}"
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
        Q(peer_id__in=user.blocked_by.values("blocker_id")) |
        Q(profile__isnull=False, help_request__isnull=True) & ~Q(profile__visibility="public")
    )


def may_email(notification):
    user, peer = notification.recipient, notification.peer
    profile = getattr(user, "profile", None)
    if not (user.is_active and user.is_student_verified and profile and profile.notification_email_enabled):
        return False
    if not peer.is_active or users_blocked(user, peer):
        return False
    if notification.kind == "skill_alert":
        return profile.skill_alerts_enabled and notification.profile is not None and notification.profile.visibility == "public"
    return True


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
    row = EmailDelivery.objects.select_for_update(of=("self",)).select_related("notification__recipient__profile", "notification__peer", "notification__profile").filter(pk=delivery_id).first()
    if not row or row.delivered_at or row.attempts >= 6 or row.next_attempt_at > timezone.now():
        return
    notification = row.notification
    row.attempts += 1
    try:
        if may_email(notification):
            send_notification_email(notification)
        row.delivered_at = timezone.now()  # Includes consent withdrawal; never deliver later.
        row.last_error = ""
    except Exception as error:
        row.last_error = type(error).__name__  # No credentials, addresses or provider response.
        row.next_attempt_at = timezone.now()+timedelta(seconds=min(30*2**(row.attempts-1), 3600))
    row.queued_until = None
    row.save()
