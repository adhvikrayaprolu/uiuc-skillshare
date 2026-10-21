"""First-party browser error reporting, on by default and off with CLIENT_ERROR_REPORTING=false."""
import hashlib
import logging
import re

from django.conf import settings
from django.db.models import F
from django.utils import timezone
from drf_spectacular.utils import extend_schema
from rest_framework import serializers, status
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import ClientError

logger = logging.getLogger("skillshare.client_errors")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+(\.[\w-]+)+")
TOKEN = re.compile(r"\b[A-Za-z0-9_-]{24,}\b")
DIGITS = re.compile(r"\d{4,}")


def scrub(value, limit):
    value = EMAIL.sub("[email]", value or "")
    value = TOKEN.sub("[token]", value)
    return DIGITS.sub("[n]", value).strip()[:limit]


def clean_path(value):
    path = (value or "").split("?", 1)[0].split("#", 1)[0]
    return re.sub(r"/\d+(?=/|$)", "/:id", path)[:200]


class ClientErrorThrottle(AnonRateThrottle):
    scope = "client_errors"

    def get_cache_key(self, request, view):
        return self.cache_format % {"scope": self.scope, "ident": self.get_ident(request)}


class ClientErrorSerializer(serializers.Serializer):
    message = serializers.CharField(max_length=2000)
    source = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    path = serializers.CharField(max_length=2000, required=False, allow_blank=True)
    release = serializers.CharField(max_length=40, required=False, allow_blank=True)


class ClientErrorView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [ClientErrorThrottle]

    @extend_schema(request=ClientErrorSerializer, responses={204: None})
    def post(self, request):
        if not settings.CLIENT_ERROR_REPORTING:
            return Response(status=status.HTTP_204_NO_CONTENT)
        serializer = ClientErrorSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        message, source = scrub(data["message"], 300), scrub(data.get("source", ""), 200)
        path, release = clean_path(data.get("path")), scrub(data.get("release", ""), 40)
        fingerprint = hashlib.sha256(f"{message}|{source}|{release}".encode()).hexdigest()
        # get_or_create absorbs a concurrent insert of the same fingerprint, so a duplicate is always counted.
        row, created = ClientError.objects.get_or_create(fingerprint=fingerprint, defaults={"message": message, "source": source, "path": path, "release": release})
        if not created:
            ClientError.objects.filter(pk=row.pk).update(count=F("count") + 1, last_seen=timezone.now(), path=path)
        logger.warning("client_error fingerprint=%s path=%s", fingerprint[:12], path)
        return Response(status=status.HTTP_204_NO_CONTENT)
