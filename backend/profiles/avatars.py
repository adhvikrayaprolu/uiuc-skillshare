from drf_spectacular.utils import extend_schema, inline_serializer
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers
from io import BytesIO
import uuid
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError
from django.core.files.base import ContentFile
from django.db import transaction
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from rest_framework.exceptions import ValidationError, APIException
from .storage import StorageUnavailable
from common.avatar_cleanup import schedule_avatar_deletion
from rest_framework.parsers import MultiPartParser
from rest_framework.response import Response
from rest_framework.views import APIView
from .models import StudentProfile
from .policy import visible_profiles


class AvatarView(APIView):
    parser_classes = [MultiPartParser]

    @extend_schema(responses={(200, "image/jpeg"): OpenApiTypes.BINARY})
    def get(self, request, pk):
        profiles = StudentProfile.objects.filter(user=request.user) if StudentProfile.objects.filter(pk=pk, user=request.user).exists() else visible_profiles(StudentProfile.objects.all(), request.user)
        profile = get_object_or_404(profiles, pk=pk)
        if not profile.profile_picture:
            from django.http import Http404
            raise Http404
        try:
            content = profile.profile_picture.open("rb")
        except FileNotFoundError:
            from django.http import Http404
            raise Http404
        except StorageUnavailable:
            raise AvatarServiceUnavailable()
        response = FileResponse(content, content_type="image/jpeg")
        response["Cache-Control"] = "private, no-store"
        response["X-Content-Type-Options"] = "nosniff"
        return response


class AvatarUploadView(APIView):
    parser_classes = [MultiPartParser]

    @extend_schema(request=inline_serializer("AvatarUpload", fields={"avatar": serializers.ImageField()}), responses=dict)
    def post(self, request):
        upload = request.FILES.get("avatar")
        if not upload or upload.size > 2 * 1024 * 1024:
            raise ValidationError({"avatar": "Choose an image no larger than 2 MB."})
        try:
            with warnings.catch_warnings():
                warnings.simplefilter("error", Image.DecompressionBombWarning)
                image = Image.open(upload)
                if image.width > 4096 or image.height > 4096:
                    raise ValueError("Image dimensions exceed 4096 pixels.")
                image.load()
                image = ImageOps.exif_transpose(image).convert("RGB")
                image.thumbnail((512, 512))
                clean = Image.new("RGB", image.size)
                clean.paste(image)
                output = BytesIO()
                clean.save(output, format="JPEG", quality=85)
        except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
            raise ValidationError({"avatar": "Upload a valid image up to 4096 pixels per side."})
        name = None
        storage = None
        try:
            with transaction.atomic():
                profile = get_object_or_404(StudentProfile.objects.select_for_update(), user=request.user)
                old = profile.profile_picture.name
                storage = profile.profile_picture.storage
                filename = f"{uuid.uuid4().hex}.jpg"
                # A timed-out provider may already have stored this immutable object.
                name = f"profile_pictures/{filename}"
                profile.profile_picture.save(filename, ContentFile(output.getvalue()), save=False)
                name = profile.profile_picture.name
                profile.save(update_fields=["profile_picture"])
                if old:
                    schedule_avatar_deletion(old)
        except Exception as error:
            if name and storage:
                schedule_avatar_deletion(name)
            if isinstance(error, StorageUnavailable):
                raise AvatarServiceUnavailable() from None
            raise
        return Response({"profile_picture": f"/api/profiles/{profile.pk}/avatar/"})


class AvatarServiceUnavailable(APIException):
    status_code = 503
    default_detail = "Avatar storage is temporarily unavailable. Try again later."
