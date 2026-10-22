"""Browser security headers and per-member creation limits."""
from rest_framework.throttling import ScopedRateThrottle

PERMISSIONS_POLICY = ", ".join(f"{feature}=()" for feature in (
    "accelerometer", "browsing-topics", "camera", "display-capture", "geolocation", "gyroscope",
    "magnetometer", "microphone", "midi", "payment", "usb",
))


class PermissionsPolicyMiddleware:
    """Turns off device and tracking features the app never uses."""

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        response.headers.setdefault("Permissions-Policy", PERMISSIONS_POLICY)
        return response


class CreateRateThrottle(ScopedRateThrottle):
    """Hourly per-member limit on creating things (requests, feedback, reports). Applies only to
    POST on views that set `create_throttle_scope`; reading and replying stay unaffected."""

    scope_attr = "create_throttle_scope"

    def allow_request(self, request, view):
        if request.method != "POST":
            return True
        return super().allow_request(request, view)
