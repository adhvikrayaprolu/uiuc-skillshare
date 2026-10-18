from .models import AnalyticsEvent


def track_event(user, event_type, metadata=None, request=None):
    if user and not user.is_authenticated: user = None
    metadata = {key: value for key, value in (metadata or {}).items() if key.endswith("_id") or key in {"mode", "result_count", "type"}}
    return AnalyticsEvent.objects.create(user=user, event_type=event_type, metadata=metadata)
