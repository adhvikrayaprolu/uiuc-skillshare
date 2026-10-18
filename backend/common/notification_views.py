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
    class Meta:
        model = Notification
        fields = ["id", "kind", "title", "href", "read", "created_at"]
        read_only_fields = fields
    def get_read(self, obj):
        return obj.read_at is not None
    def get_href(self, obj):
        return "/requests"


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = NotificationSerializer
    def get_queryset(self):
        return visible_notifications(self.request.user)
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
