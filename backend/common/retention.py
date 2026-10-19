"""Skill alerts for newly published teachers and the opt-in weekly digest."""
from collections import defaultdict
from datetime import timedelta

from django.db import IntegrityError, transaction
from django.db.models import Q
from django.utils import timezone

from profiles.models import StudentProfile
from .emails import send_branded
from .models import EmailDelivery, Notification

ALERT_BATCH = 20
MAX_ALERT_RECIPIENTS = 200
DIGEST_BATCH = 20
DIGEST_INTERVAL = timedelta(days=7)


def announceable_profiles():
    return StudentProfile.objects.filter(
        alerts_sent_at__isnull=True, visibility=StudentProfile.Visibility.PUBLIC, open_to_connect=True,
        user__is_active=True, user__is_student_verified=True, user__is_demo=False, user__has_completed_onboarding=True,
    )


def alert_recipients(profile):
    """Learners who want a skill `profile` teaches, mapped to the first matching skill name."""
    taught = list(profile.profile_skills.filter(skill__is_approved=True).values_list("skill_id", flat=True))
    if not taught:
        return {}
    teacher = profile.user
    rows = (
        StudentProfile.objects.filter(
            learning_goals__in=taught, skill_alerts_enabled=True,
            user__is_active=True, user__is_student_verified=True, user__is_demo=False, user__has_completed_onboarding=True,
        )
        .exclude(user=teacher)
        .exclude(Q(user_id__in=teacher.blocked_users.values("blocked_user_id")) | Q(user_id__in=teacher.blocked_by.values("blocker_id")))
        .order_by("pk", "learning_goals__name")
        .values_list("pk", "user_id", "notification_email_enabled", "learning_goals__name", "learning_goals__id")
    )
    recipients = {}
    for pk, user_id, wants_email, skill_name, skill_id in rows.iterator():
        if skill_id not in taught or user_id in recipients:
            continue
        if len(recipients) >= MAX_ALERT_RECIPIENTS:
            break
        recipients[user_id] = (skill_name, wants_email)
    return recipients


def alert_title(profile, skill_name):
    name = profile.display_name.split(" ")[0] or "A new member"
    return f"{name} just joined and teaches {skill_name}"[:120]


def send_skill_alerts(now=None):
    now = now or timezone.now()
    sent = 0
    with transaction.atomic():
        profiles = list(announceable_profiles().select_for_update(skip_locked=True, of=("self",)).select_related("user")[:ALERT_BATCH])
        for profile in profiles:
            for user_id, (skill_name, wants_email) in alert_recipients(profile).items():
                try:
                    with transaction.atomic():
                        record = Notification.objects.create(
                            recipient_id=user_id, peer=profile.user, profile=profile, kind="skill_alert",
                            event_key=f"skill-alert:{profile.pk}", title=alert_title(profile, skill_name),
                        )
                except IntegrityError:
                    continue
                if wants_email:
                    EmailDelivery.objects.create(notification=record)
                sent += 1
            profile.alerts_sent_at = now
            profile.save(update_fields=["alerts_sent_at"])
    return sent


def digest_content(profile, since):
    from interactions.buckets import filter_bucket
    from interactions.models import HelpRequest
    from .notifications import visible_notifications
    user = profile.user
    blocked = Q(seeker_id__in=user.blocked_users.values("blocked_user_id")) | Q(seeker_id__in=user.blocked_by.values("blocker_id")) | \
        Q(helper_profile__user_id__in=user.blocked_users.values("blocked_user_id")) | Q(helper_profile__user_id__in=user.blocked_by.values("blocker_id"))
    mine = HelpRequest.objects.filter(Q(seeker=user) | Q(helper_profile__user=user)).exclude(blocked)
    waiting = filter_bucket(mine, user, "needs_action").order_by("-updated_at")
    alerts = visible_notifications(user).filter(kind="skill_alert", created_at__gte=since).order_by("-created_at")
    return {
        "waiting_count": waiting.count(),
        "waiting": [row.topic for row in waiting[:3]],
        "new_teachers": [row.title for row in alerts[:3]],
        "new_teacher_count": alerts.count(),
    }


def send_weekly_digests(now=None):
    """At most once per member per week. The send time is claimed before mailing so a crash never double-sends."""
    now = now or timezone.now()
    due = StudentProfile.objects.filter(
        digest_email_enabled=True, user__is_active=True, user__is_student_verified=True, user__is_demo=False,
    ).filter(Q(last_digest_at__isnull=True) | Q(last_digest_at__lte=now - DIGEST_INTERVAL))
    with transaction.atomic():
        profiles = list(due.select_for_update(skip_locked=True, of=("self",)).select_related("user")[:DIGEST_BATCH])
        claims = []
        for profile in profiles:
            since = profile.last_digest_at or now - DIGEST_INTERVAL
            profile.last_digest_at = now
            profile.save(update_fields=["last_digest_at"])
            claims.append((profile, since))
    sent = 0
    for profile, since in claims:
        content = digest_content(profile, since)
        if not content["waiting_count"] and not content["new_teacher_count"]:
            continue
        try:
            send_branded("Your week on Illini SkillShare", profile.user.email, "digest", {"name": profile.display_name.split(" ")[0], **content})
            sent += 1
        except Exception:
            continue  # Skipped this week; never retried so members are not emailed twice.
    return sent
