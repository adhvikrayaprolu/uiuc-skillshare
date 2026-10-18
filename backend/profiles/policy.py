"""Shared peer visibility and connection-based contact authorization."""
from django.db.models import Q


def users_blocked(first, second):
    from interactions.models import BlockedUser
    return BlockedUser.objects.filter(
        Q(blocker=first, blocked_user=second) | Q(blocker=second, blocked_user=first)
    ).exists()


def visible_profiles(queryset, viewer):
    if not viewer or not viewer.is_authenticated or not viewer.is_active or not viewer.is_student_verified:
        return queryset.none()
    return queryset.filter(visibility="public", user__is_active=True, user__is_student_verified=True).exclude(
        Q(user_id__in=viewer.blocked_users.values("blocked_user_id")) |
        Q(user_id__in=viewer.blocked_by.values("blocker_id"))
    ).distinct()


def can_view_profile(viewer, profile):
    return visible_profiles(type(profile).objects.filter(pk=profile.pk), viewer).exists()


def can_share_contacts(viewer, profile):
    from interactions.models import HelpRequest
    if not viewer or not viewer.is_authenticated or not viewer.is_active or not viewer.is_student_verified:
        return False
    if viewer.pk == profile.user_id:
        return True
    if not can_view_profile(viewer, profile) or not getattr(profile, "share_contacts", True):
        return False
    return HelpRequest.objects.filter(status__in=["accepted", "completed"]).filter(
        Q(seeker=viewer, helper_profile=profile) |
        Q(seeker=profile.user, helper_profile__user=viewer)
    ).exists()
