from django.urls import path
from .notification_views import NotificationViewSet

from .views import analytics_summary, admin_analytics_summary, bootstrap, dashboard, health, readiness, onboarding_status


urlpatterns = [
    path("notifications/", NotificationViewSet.as_view({"get": "list"}), name="notifications-list"),
    path("notifications/read-all/", NotificationViewSet.as_view({"post": "read_all"}), name="notifications-read-all"),
    path("notifications/<int:pk>/read/", NotificationViewSet.as_view({"post": "read"}), name="notification-read"),
    path("health/", health, name="health"),
    path("health/live/", health, name="liveness"),
    path("health/ready/", readiness, name="readiness"),
    path("dashboard/", dashboard, name="dashboard"),
    path("bootstrap/", bootstrap, name="bootstrap"),
    path("onboarding/status/", onboarding_status, name="onboarding-status"),
    path("analytics/summary/", analytics_summary, name="analytics-summary"),
    path("admin/analytics/summary/", admin_analytics_summary, name="admin-analytics-summary"),
]
