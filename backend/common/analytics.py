from .models import AnalyticsEvent


def _client_ip(request):
    if not request:
        return None
    forwarded = request.META.get("HTTP_X_FORWARDED_FOR")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def track_event(user, event_type, metadata=None, request=None):
    if user and not user.is_authenticated:
        user = None
    return AnalyticsEvent.objects.create(
        user=user,
        event_type=event_type,
        metadata=metadata or {},
        ip_address=_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "") if request else "",
    )
