from .models import AnalyticsEvent


def track_event(user, event_type, metadata=None, request=None):
    if user and not user.is_authenticated: user = None
    metadata = {key: value for key, value in (metadata or {}).items() if key.endswith("_id") or key in {"mode", "result_count", "type"}}
    return AnalyticsEvent.objects.create(user=user, event_type=event_type, metadata=metadata)


def track_first_match(user, result_count, source):
    """Record only the first time a member sees any match, for the time-to-first-match metric."""
    if not result_count or not user or not user.is_authenticated:
        return None
    if AnalyticsEvent.objects.filter(user=user, event_type=AnalyticsEvent.EventType.MATCHES_SHOWN).exists():
        return None
    return track_event(user, AnalyticsEvent.EventType.MATCHES_SHOWN, {"result_count": result_count, "mode": source})
