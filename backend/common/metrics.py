"""Launch success metrics (CONTEXT.md §10), computed from existing records. Staff only."""
from datetime import timedelta
from statistics import median

from django.db.models import Count, F, Min, Q
from django.utils import timezone

SAMPLE = 5000


def rate(part, whole):
    return round(part / whole, 3) if whole else None


def median_hours(deltas, unit=3600):
    values = [delta.total_seconds() / unit for delta in deltas if delta is not None]
    return round(median(values), 1) if values else None


def launch_metrics(now=None):
    from accounts.models import User
    from interactions.models import HelpRequest, Review
    from .models import AnalyticsEvent
    now = now or timezone.now()
    members = User.objects.filter(is_student_verified=True, is_demo=False, is_staff=False)
    signups = members.count()
    live = members.filter(has_completed_onboarding=True)

    first_match = (
        AnalyticsEvent.objects.filter(event_type=AnalyticsEvent.EventType.MATCHES_SHOWN, user__in=members)
        .values("user_id", "user__date_joined").annotate(first=Min("created_at")).order_by("-first")[:SAMPLE]
    )
    to_first_match = [row["first"] - row["user__date_joined"] for row in first_match]

    cohort = live.filter(date_joined__lte=now - timedelta(days=7))
    sent_in_week = cohort.filter(sent_help_requests__created_at__lte=F("date_joined") + timedelta(days=7)).distinct().count()

    requests = HelpRequest.objects.all()
    accepted = requests.filter(accepted_at__isnull=False)
    decided = requests.filter(Q(accepted_at__isnull=False) | Q(declined_at__isnull=False) | Q(status=HelpRequest.Status.EXPIRED))
    responses = [
        (row["accepted_at"] or row["declined_at"]) - row["created_at"]
        for row in requests.filter(Q(accepted_at__isnull=False) | Q(declined_at__isnull=False))
        .order_by("-created_at").values("created_at", "accepted_at", "declined_at")[:SAMPLE]
    ]
    completed = requests.filter(status=HelpRequest.Status.COMPLETED)
    swaps_done = completed.filter(kind=HelpRequest.Kind.SWAP).annotate(reviewers=Count("reviews__reviewer", distinct=True))
    with_feedback = completed.filter(reviews__isnull=False).distinct().count()

    return {
        "signups": signups,
        "setup_completion_rate": rate(live.count(), signups),
        "median_minutes_to_first_match": median_hours(to_first_match, unit=60),
        "sent_request_within_7_days_rate": rate(sent_in_week, cohort.count()),
        "sent_request_cohort": cohort.count(),
        "acceptance_rate": rate(accepted.count(), decided.count()),
        "median_response_hours": median_hours(responses),
        "completion_rate": rate(completed.count(), accepted.count()),
        "feedback_rate": rate(with_feedback, completed.count()),
        "two_sided_swap_feedback_rate": rate(swaps_done.filter(reviewers__gte=2).count(), swaps_done.count()),
        "review_count": Review.objects.count(),
        "generated_at": now,
    }
