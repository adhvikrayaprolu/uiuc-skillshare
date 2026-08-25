from django.urls import path

from .views import analytics_summary, bootstrap, dashboard, health, onboarding_status


urlpatterns = [
    path("health/", health, name="health"),
    path("dashboard/", dashboard, name="dashboard"),
    path("bootstrap/", bootstrap, name="bootstrap"),
    path("onboarding/status/", onboarding_status, name="onboarding-status"),
    path("analytics/summary/", analytics_summary, name="analytics-summary"),
    path("admin/analytics/summary/", analytics_summary, name="admin-analytics-summary"),
]
