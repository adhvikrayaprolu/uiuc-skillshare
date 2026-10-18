"""Transactional request transitions. Pair locks also serialize blocking/deletion."""
import hashlib
import json
import unicodedata
from datetime import timedelta

from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from rest_framework.exceptions import APIException

from accounts.models import User
from common.analytics import track_event
from profiles.policy import can_view_profile
from .models import Endorsement, HelpRequest, Review


class Conflict(APIException):
    status_code = 409
    default_detail = "The request changed. Refresh and try again."


def lock_pair(first, second):
    list(User.objects.select_for_update().filter(pk__in=[first, second]).order_by("pk"))


def topic_key(topic):
    normalized = " ".join(unicodedata.normalize("NFKC", topic).casefold().split())
    return hashlib.sha256(normalized.encode()).hexdigest()


@transaction.atomic
def create_request(serializer, data):
    user = serializer.context["request"].user
    helper = data["helper_profile"]
    lock_pair(user.pk, helper.user_id)
    serializer.validate_helper_profile(helper)
    skill = data.get("related_skill")
    if skill and not helper.profile_skills.filter(skill=skill, skill__is_approved=True).exists():
        raise serializers.ValidationError({"related_skill": "Choose a skill this helper offers."})
    digest = hashlib.sha256(json.dumps({key: str(value.pk if hasattr(value, "pk") else value) for key, value in data.items() if key not in {"idempotency_key", "seeker"}}, sort_keys=True).encode()).hexdigest()
    key = data.get("idempotency_key")
    if key:
        previous = HelpRequest.objects.filter(seeker=user, idempotency_key=key).first()
        if previous:
            if previous.content_hash != digest:
                raise Conflict("That submission key was used for a different request.")
            return previous
    if HelpRequest.objects.filter(seeker=user, created_at__gte=timezone.now()-timedelta(days=1)).count() >= 10:
        raise serializers.ValidationError("You can send at most 10 requests in 24 hours.")
    normalized = topic_key(data["topic"])
    if HelpRequest.objects.filter(seeker=user, helper_profile=helper, topic_key=normalized, status__in=["pending", "accepted"]).exists():
        raise Conflict("An active request for this topic already exists.")
    data.update(seeker=user, status="pending", version=1, content_hash=digest, topic_key=normalized)
    obj = HelpRequest.objects.create(**data)
    track_event(user, "help_request_created", {"help_request_id": obj.pk, "helper_profile_id": helper.pk}, serializer.context["request"])
    from common.notifications import notify_request
    notify_request(obj, "created", user.pk)
    return obj


@transaction.atomic
def transition_request(serializer, instance, data):
    lock_pair(instance.seeker_id, instance.helper_profile.user_id)
    obj = HelpRequest.objects.select_for_update().select_related("helper_profile__user", "seeker").get(pk=instance.pk)
    # Revalidate under the lock, rather than trusting the earlier HTTP snapshot.
    serializer.instance = obj
    expected = data.pop("version", None)
    if expected is None:
        raise serializers.ValidationError({"version": "Supply the version returned by the server."})
    if expected != obj.version:
        raise Conflict()
    serializer.validate(data)
    if all(getattr(obj, key) == value for key, value in data.items()):
        return obj
    for key, value in data.items():
        setattr(obj, key, value)
    obj.version += 1
    obj.mark_status_timestamp()
    obj.save()
    from common.notifications import notify_request
    notify_request(obj, obj.status, serializer.context["request"].user.pk)
    return obj


def validate_feedback(attrs, context, instance=None, endorsement=False):
    profile = context.get("profile") or getattr(instance, "profile", None)
    interaction = attrs.get("help_request") or getattr(instance, "help_request", None)
    viewer = context["request"].user
    if not interaction or interaction.status != "completed" or interaction.seeker_id != viewer.pk or interaction.helper_profile_id != profile.pk or not can_view_profile(viewer, profile):
        raise serializers.ValidationError({"help_request": "Feedback requires your completed request with this helper."})
    if instance and interaction.pk != instance.help_request_id:
        raise serializers.ValidationError({"help_request": "Cannot reassign feedback."})
    skill = attrs.get("skill" if endorsement else "related_skill")
    if endorsement and not skill:
        raise serializers.ValidationError({"skill": "Select the skill involved in this request."})
    if skill and interaction.related_skill_id != skill.pk:
        raise serializers.ValidationError("Feedback must concern the skill involved in the request.")
    if not endorsement and not instance and Review.objects.filter(help_request=interaction).exists():
        raise serializers.ValidationError("This request already has a review.")
    if endorsement and Endorsement.objects.filter(help_request=interaction, skill=skill).exists():
        raise serializers.ValidationError("This request already has that endorsement.")
