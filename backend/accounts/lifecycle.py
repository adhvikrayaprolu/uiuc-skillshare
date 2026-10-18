from django.contrib.auth import logout
from django.contrib.sessions.models import Session
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.response import Response
from rest_framework.views import APIView
from common.models import AnalyticsEvent
from interactions.models import HelpRequest, ModerationAudit
from interactions.serializers import HelpRequestSerializer
from profiles.serializers import StudentProfileSerializer
from .models import User
from .serializers import CurrentUserSerializer


def revoke_sessions(user_id):
    for session in Session.objects.filter(expire_date__gt=timezone.now()).iterator():
        if str(session.get_decoded().get("_auth_user_id")) == str(user_id):
            session.delete()


class AccountExportView(APIView):
    def get(self, request):
        profile = getattr(request.user, "profile", None)
        requests = HelpRequest.objects.filter(Q(seeker=request.user) | Q(helper_profile__user=request.user))
        data = {"account": CurrentUserSerializer(request.user).data, "profile": StudentProfileSerializer(profile, context={"request": request}).data if profile else None,
                "help_requests": HelpRequestSerializer(requests, many=True, context={"request": request}).data,
                "saved": list(request.user.saved_profiles.values("saved_profile_id", "note", "created_at")),
                "blocks": list(request.user.blocked_users.values("blocked_label", "created_at")),
                "reviews_written": list(request.user.written_reviews.values("profile_id", "rating", "comment", "created_at")),
                "endorsements_given": list(request.user.given_endorsements.values("profile_id", "skill_id", "note", "created_at"))}
        response = Response(data)
        response["Content-Disposition"] = 'attachment; filename="skillshare-account.json"'
        response["Cache-Control"] = "no-store"
        return response


class AccountDeleteView(APIView):
    def post(self, request):
        if request.data.get("confirmation") != request.user.email:
            raise ValidationError({"confirmation": "Type your account email to confirm deletion."})
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=request.user.pk)
            profile = getattr(user, "profile", None)
            request_ids = list(HelpRequest.objects.filter(Q(seeker=user) | Q(helper_profile__user=user)).values_list("id", flat=True))
            events = Q(user=user) | Q(metadata__help_request_id__in=request_ids)
            if profile:
                events |= Q(metadata__profile_id=profile.pk) | Q(metadata__helper_profile_id=profile.pk)
                if profile.profile_picture:
                    name, storage = profile.profile_picture.name, profile.profile_picture.storage
                    transaction.on_commit(lambda: storage.delete(name))
            AnalyticsEvent.objects.filter(events).delete()
            revoke_sessions(user.pk)
            ModerationAudit.objects.create(actor=user, subject=user, action="account_deleted")
            user.delete()
            logout(request)
        return Response({"success": True})
