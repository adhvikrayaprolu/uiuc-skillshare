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
    if profile.profile_skills.count() < 1:
        steps.append("add_skills")
    if not profile.availability.exists() and not profile.availability_notes:
        steps.append("add_availability")
    if not profile.contact_methods.filter(is_public=True).exists():
        steps.append("add_contact_method")
    if not profile.credentials.filter(visibility="public").exists():
        steps.append("add_credential")
    return steps


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
