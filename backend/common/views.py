from django.db.models import Count, Q
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAdminUser, IsAuthenticated
from rest_framework.response import Response

from accounts.models import User
from accounts.serializers import CurrentUserSerializer
from interactions.models import SavedProfile
from interactions.models import HelpRequest
from profiles.models import StudentProfile
from profiles.serializers import PublicStudentProfileListSerializer, StudentProfileSerializer
from taxonomy.models import SkillCategory, SkillTag
from taxonomy.serializers import SkillCategorySerializer, SkillTagSerializer
from .models import AnalyticsEvent


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    return Response({"status": "ok", "service": "uiuc-skillshare-backend"})


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def dashboard(request):
    return Response(build_dashboard_payload(request))


def missing_onboarding_steps(profile):
    if not profile:
        return ["create_profile"]
    steps = []
    if profile.profile_skills.count() < 3:
        steps.append("add_skills")
    if not profile.availability.exists() and not profile.availability_notes:
        steps.append("add_availability")
    if not profile.contact_methods.filter(is_public=True).exists():
        steps.append("add_contact_method")
    if not profile.credentials.filter(visibility="public").exists():
        steps.append("add_credential")
    return steps


def build_dashboard_payload(request):
    profile = getattr(request.user, "profile", None)
    incoming = profile.received_help_requests.exclude(status__in=["completed", "cancelled"]).count() if profile else 0
    outgoing = request.user.sent_help_requests.exclude(status__in=["completed", "cancelled"]).count()
    connections_count = HelpRequest.objects.filter(status=HelpRequest.Status.ACCEPTED).filter(
        Q(seeker=request.user) | Q(helper_profile__user=request.user)
    ).count()
    next_actions = []
    if not profile:
        next_actions.append("Create your profile")
    else:
        if profile.profile_skills.count() < 3:
            next_actions.append("Add at least 3 skills")
        if not profile.availability.exists() and not profile.availability_notes:
            next_actions.append("Add availability")
        if not profile.credentials.filter(visibility="public").exists():
            next_actions.append("Add a LinkedIn or GitHub credential")
        if not profile.contact_methods.filter(is_public=True).exists():
            next_actions.append("Add a public contact method")
    return {
        "user": CurrentUserSerializer(request.user).data,
        "profile": StudentProfileSerializer(profile, context={"request": request}).data if profile else None,
        "profile_completeness": profile.profile_completeness if profile else 0,
        "skill_count": profile.profile_skills.count() if profile else 0,
        "saved_profile_count": request.user.saved_profiles.count(),
        "incoming_help_request_count": incoming,
        "outgoing_help_request_count": outgoing,
        "connections_count": connections_count,
        "review_count": profile.reviews.count() if profile else 0,
        "next_actions": next_actions,
        "recommended_profiles": PublicStudentProfileListSerializer(
            StudentProfile.objects.filter(visibility="public", open_to_connect=True).exclude(user=request.user)[:6],
            many=True,
            context={"request": request},
        ).data,
    }


@extend_schema(responses=dict)
@api_view(["GET"])
@permission_classes([IsAuthenticated])
def bootstrap(request):
    profile = getattr(request.user, "profile", None)
    popular_skills = SkillTag.objects.select_related("category").filter(is_approved=True).annotate(profile_count=Count("profile_skills")).order_by("-profile_count", "name")[:20]
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
    profile = getattr(request.user, "profile", None)
    incoming_active = (
        profile.received_help_requests.filter(status__in=[HelpRequest.Status.PENDING, HelpRequest.Status.ACCEPTED]).count()
        if profile
        else 0
    )
    outgoing_active = request.user.sent_help_requests.filter(status__in=[HelpRequest.Status.PENDING, HelpRequest.Status.ACCEPTED]).count()
    my_connections = HelpRequest.objects.filter(status__in=[HelpRequest.Status.ACCEPTED, HelpRequest.Status.COMPLETED]).filter(
        Q(seeker=request.user) | Q(helper_profile__user=request.user)
    ).count()

    top_skills = SkillTag.objects.annotate(profile_count=Count("profile_skills")).order_by("-profile_count", "name")[:8]
    request_status_counts = {status: count for status, count in HelpRequest.objects.values_list("status").annotate(count=Count("id"))}
    connections_count = HelpRequest.objects.filter(status__in=[HelpRequest.Status.ACCEPTED, HelpRequest.Status.COMPLETED]).count()
    return Response(
        {
            "user_summary": {
                "saved_profiles_count": request.user.saved_profiles.count(),
                "active_help_requests_count": incoming_active + outgoing_active,
                "connections_count": my_connections,
                "profile_skills_count": profile.profile_skills.count() if profile else 0,
                "public_credentials_count": profile.credentials.filter(visibility="public").count() if profile else 0,
                "profile_completeness": profile.profile_completeness if profile else 0,
            },
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
    )
