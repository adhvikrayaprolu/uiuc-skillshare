from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes, throttle_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from accounts.serializers import CurrentUserSerializer
from interactions.models import SavedProfile
from interactions.models import HelpRequest
from profiles.models import StudentProfile
from profiles.policy import visible_profiles, visible_feedback
from profiles.serializers import PublicStudentProfileListSerializer, StudentProfileSerializer
from taxonomy.models import SkillCategory, SkillTag
from taxonomy.serializers import SkillCategorySerializer, SkillTagSerializer
from .models import AnalyticsEvent


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([])
def health(request):
    return Response({"status": "ok", "service": "uiuc-skillshare-backend"})


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([AllowAny])
@throttle_classes([])
def readiness(request):
    from django.db import connection
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
            cursor.fetchone()
        from django.core.cache import cache
        cache.set("health-readiness", "ok", timeout=15)
        if cache.get("health-readiness") != "ok":
            raise RuntimeError("Shared cache unavailable")
    except Exception:
        return Response({"status": "unavailable"}, status=503)
    return Response({"status": "ready"})


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    return Response(build_dashboard_payload(request))


def missing_onboarding_steps(profile):
    if not profile:
        return ["create_profile"]
    steps = []
    if not all([profile.display_name, profile.major, profile.year, profile.headline]):
        steps.append("add_basics")
    if profile.profile_skills.count() < 1:
        steps.append("add_skills")
    if not profile.learning_goals.exists():
        steps.append("add_learning_goals")
    if not profile.availability.exists() and not profile.availability_notes:
        steps.append("add_availability")
    return steps


def setup_checklist(profile):
    if not profile:
        return []
    items = [
        ("publish", "Publish your profile so others can find you", profile.visibility == "public", "/settings"),
        ("bio", "Add a short bio", bool(profile.bio.strip()), "/me/edit?tab=basic"),
        ("second_skill", "Add a second skill you can teach", profile.profile_skills.count() >= 2, "/me/edit?tab=teaching"),
        ("contacts", "Share a contact method after you accept a request", profile.share_contacts and profile.contact_methods.filter(is_public=True).exists(), "/me/edit?tab=contact"),
        ("avatar", "Add a profile photo", bool(profile.profile_picture), "/me/edit?tab=basic"),
        ("evidence", "Link a project, portfolio or GitHub", profile.credentials.filter(visibility="public").exists(), "/me/edit?tab=evidence"),
    ]
    return [{"key": key, "label": label, "done": bool(done), "href": href} for key, label, done, href in items]


def peer_summary(user, profile):
    from profiles.policy import can_view_profile
    if not profile or not can_view_profile(user, profile):
        return {"name": "Unavailable member", "profile_id": None}
    return {"name": profile.display_name, "profile_id": profile.pk}


def attention_items(user, requests):
    items = []
    rows = requests.filter(status__in=["pending", "accepted", "completed"]).select_related("seeker__profile", "helper_profile", "related_skill").order_by("-updated_at")[:50]
    from interactions.models import Review
    reviewed = set(Review.objects.filter(reviewer=user, help_request__in=[row.pk for row in rows]).values_list("help_request_id", flat=True))
    for row in rows:
        incoming = row.helper_profile.user_id == user.pk
        peer = peer_summary(user, getattr(row.seeker, "profile", None) if incoming else row.helper_profile)
        action = None
        if row.status == "pending" and incoming:
            action = "respond"
        elif row.status == "accepted":
            action = "complete"
        elif row.status == "completed" and not incoming and row.pk not in reviewed:
            action = "feedback"
        if action:
            items.append({"action": action, "request_id": row.pk, "topic": row.topic, "skill": row.related_skill.name if row.related_skill_id else None, "peer": peer, "updated_at": row.updated_at})
    order = {"respond": 0, "complete": 1, "feedback": 2}
    return sorted(items, key=lambda item: order[item["action"]])[:10]


def visible_member_requests(user):
    peers = visible_profiles(StudentProfile.objects.all(), user)
    return HelpRequest.objects.filter(
        Q(seeker=user, helper_profile__in=peers) |
        Q(helper_profile__user=user, seeker_id__in=peers.values('user_id'))
    )


def build_dashboard_payload(request):
    profile = getattr(request.user, "profile", None)
    requests = visible_member_requests(request.user)
    active = requests.filter(status__in=['pending', 'accepted'])
    incoming = active.filter(helper_profile__user=request.user).count()
    outgoing = active.filter(seeker=request.user).count()
    connections_count = requests.filter(status__in=['accepted', 'completed']).count()
    next_actions = []
    if not profile:
        next_actions.append("Create your profile")
    else:
        if profile.profile_skills.count() < 1:
            next_actions.append("Add a skill you can help with")
        if not profile.availability.exists() and not profile.availability_notes:
            next_actions.append("Add availability")
        if not profile.credentials.filter(visibility="public").exists():
            next_actions.append("Add a LinkedIn or GitHub credential")
        if not profile.contact_methods.filter(is_public=True).exists():
            next_actions.append("Choose contacts to share after acceptance")
    from discovery.services import apply_discovery_filters, recommend_profiles_for_user
    recommendations = recommend_profiles_for_user(request.user, apply_discovery_filters(StudentProfile.objects.exclude(user=request.user), {}, request.user))
    return {
        "recommendation_basis": recommendations.metadata["recommendation_basis"],
        "user": CurrentUserSerializer(request.user).data,
        "profile": StudentProfileSerializer(profile, context={"request": request}).data if profile else None,
        "profile_completeness": profile.profile_completeness if profile else 0,
        "skill_count": profile.profile_skills.count() if profile else 0,
        "saved_profile_count": request.user.saved_profiles.filter(saved_profile__in=visible_profiles(StudentProfile.objects.all(), request.user)).count(),
        "incoming_help_request_count": incoming,
        "outgoing_help_request_count": outgoing,
        "connections_count": connections_count,
        "review_count": visible_feedback(profile.reviews.all(), request.user).count() if profile else 0,
        "next_actions": next_actions,
        "attention_items": attention_items(request.user, requests),
        "checklist": setup_checklist(profile),
        "recommended_profiles": PublicStudentProfileListSerializer(
            [p for _, p in recommendations[:6]],
            many=True,
            context={"request": request},
        ).data,
    }


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def bootstrap(request):
    profile = getattr(request.user, "profile", None)
    popular_skills = SkillTag.objects.select_related("category").filter(is_approved=True).annotate(profile_count=Count("profile_skills", filter=Q(profile_skills__profile__in=visible_profiles(StudentProfile.objects.all(), request.user)), distinct=True)).order_by("-profile_count", "name")[:20]
    return Response(
        {
            "user": CurrentUserSerializer(request.user).data,
            "has_profile": bool(profile),
            "profile": StudentProfileSerializer(profile, context={"request": request}).data if profile else None,
            "skill_categories": SkillCategorySerializer(SkillCategory.objects.all(), many=True).data,
            "popular_skills": SkillTagSerializer(popular_skills, many=True).data,
            "dashboard": build_dashboard_payload(request),
        }
    )


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def onboarding_status(request):
    profile = getattr(request.user, "profile", None)
    return Response(
        {
            "has_completed_onboarding": request.user.has_completed_onboarding,
            "has_profile": bool(profile),
            "profile_completeness": profile.profile_completeness if profile else 0,
            "missing_steps": missing_onboarding_steps(profile),
        }
    )


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def analytics_summary(request):
    return Response(analytics_payload(request))


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([IsAdminUser])
def admin_analytics_summary(request):
    return Response(analytics_payload(request))


def analytics_payload(request):
    profile = getattr(request.user, "profile", None)
    requests = visible_member_requests(request.user)
    active = requests.filter(status__in=['pending', 'accepted'])
    incoming_active = active.filter(helper_profile__user=request.user).count()
    outgoing_active = active.filter(seeker=request.user).count()
    my_connections = requests.filter(status__in=['accepted', 'completed']).count()

    personal = {"saved_profiles_count": request.user.saved_profiles.filter(saved_profile__in=visible_profiles(StudentProfile.objects.all(), request.user)).count(), "active_help_requests_count": incoming_active + outgoing_active, "connections_count": my_connections, "profile_skills_count": profile.profile_skills.count() if profile else 0, "public_credentials_count": profile.credentials.filter(visibility="public").count() if profile else 0, "profile_completeness": profile.profile_completeness if profile else 0}
    if not request.user.is_staff:
        return {"user_summary": personal}
    top_skills = SkillTag.objects.annotate(profile_count=Count("profile_skills")).order_by("-profile_count", "name")[:8]
    request_status_counts = {status: count for status, count in HelpRequest.objects.values_list("status").annotate(count=Count("id"))}
    connections_count = HelpRequest.objects.filter(status__in=[HelpRequest.Status.ACCEPTED, HelpRequest.Status.COMPLETED]).count()
    return {
            "user_summary": personal,
            "network_summary": {
                "total_users": User.objects.count(),
                "total_profiles": StudentProfile.objects.count(),
                "total_skills": SkillTag.objects.count(),
                "saved_profiles_count": SavedProfile.objects.count(),
                "total_help_requests": HelpRequest.objects.count(),
                "connections_count": connections_count,
                "top_skills": [{"skill": skill.name, "count": skill.profile_count} for skill in top_skills],
                "request_status_counts": {
                    "pending": request_status_counts.get(HelpRequest.Status.PENDING, 0),
                    "accepted": request_status_counts.get(HelpRequest.Status.ACCEPTED, 0),
                    "declined": request_status_counts.get(HelpRequest.Status.DECLINED, 0),
                    "completed": request_status_counts.get(HelpRequest.Status.COMPLETED, 0),
                    "cancelled": request_status_counts.get(HelpRequest.Status.CANCELLED, 0),
                },
            },
        }
