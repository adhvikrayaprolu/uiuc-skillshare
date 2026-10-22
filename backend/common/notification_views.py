from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from .models import Notification
from .notifications import visible_notifications


class NotificationSerializer(serializers.ModelSerializer):
    read = serializers.SerializerMethodField()
    href = serializers.SerializerMethodField()
    peer_name = serializers.SerializerMethodField()
    detail = serializers.SerializerMethodField()
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "peer_name", "detail", "href", "read", "created_at"]
        read_only_fields = fields
    def get_read(self, obj) -> bool:
        return obj.read_at is not None
    def get_href(self, obj) -> str:
        return obj.href
    def get_peer_name(self, obj) -> str:
        profile = getattr(obj.peer, "profile", None)
        return profile.display_name if profile else ""
    def get_detail(self, obj) -> str:
        # What the notification is about: the request's topic, or a new member's headline.
        if obj.help_request_id:
            return f"“{obj.help_request.topic}”"
        return obj.profile.headline if obj.profile_id else ""


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return visible_notifications(self.request.user).select_related("peer__profile", "help_request", "profile")
    def list(self, request, *args, **kwargs):
        response = super().list(request, *args, **kwargs)
        response.data["unread_count"] = self.get_queryset().filter(read_at__isnull=True).count()
        return response
    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        obj = self.get_object()
        Notification.objects.filter(pk=obj.pk, read_at__isnull=True).update(read_at=timezone.now())
        return Response({"read": True})
    @action(detail=False, methods=["post"], url_path="read-all")
    def read_all(self, request):
        self.get_queryset().filter(read_at__isnull=True).update(read_at=timezone.now())
        return Response({"unread_count": 0})
