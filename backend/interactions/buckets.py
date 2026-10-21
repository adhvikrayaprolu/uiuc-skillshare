"""Inbox buckets for a member's requests, computed in the database."""
from django.db.models import Exists, OuterRef, Q

from profiles.models import StudentProfile
from profiles.policy import visible_profiles
from .models import HelpRequest, Review

BUCKETS = ("needs_action", "active", "past")


def owes_feedback(user):
    """Completed requests where `user` can still review a visible peer."""
    peers = visible_profiles(StudentProfile.objects.all(), user)
    as_seeker = Q(seeker=user, helper_profile__in=peers)
    as_swap_helper = Q(kind=HelpRequest.Kind.SWAP, helper_profile__user=user, seeker__profile__in=peers)
    return Q(status=HelpRequest.Status.COMPLETED, reviewed_by_me=False) & (as_seeker | as_swap_helper)


def filter_bucket(queryset, user, bucket):
    queryset = queryset.annotate(reviewed_by_me=Exists(Review.objects.filter(help_request=OuterRef("pk"), reviewer=user)))
    needs_action = Q(status=HelpRequest.Status.PENDING, helper_profile__user=user) | owes_feedback(user)
    if bucket == "needs_action":
        return queryset.filter(needs_action)
    if bucket == "active":
        return queryset.filter(Q(status=HelpRequest.Status.PENDING, seeker=user) | Q(status=HelpRequest.Status.ACCEPTED))
    return queryset.filter(status__in=[HelpRequest.Status.DECLINED, HelpRequest.Status.CANCELLED, HelpRequest.Status.COMPLETED]).exclude(needs_action)
