import tempfile
from datetime import timedelta
from pathlib import Path
from unittest.mock import patch

from django.core.cache import cache
from django.test import Client, override_settings
from django.urls import reverse
from django.utils import timezone

from accounts.models import User
from discovery.tests_swaps import SwapFixture
from interactions.models import HelpRequest, Review
from .metrics import launch_metrics
from .models import AnalyticsEvent, ClientError


class ClientErrorTests(SwapFixture):
    def setUp(self):
        super().setUp()
        cache.clear()
        self.browser = Client(enforce_csrf_checks=True)

    def report(self, **data):
        payload = {"message": "TypeError: x is undefined", "source": "/assets/index.js:1:200", "path": "/profiles/42?tab=x", "release": "abc123", **data}
        return self.browser.post(reverse("client-errors"), payload, content_type="application/json")

    def test_errors_are_grouped_scrubbed_and_need_no_session_or_csrf(self):
        self.assertEqual(self.report().status_code, 204)
        self.assertEqual(self.report(path="/profiles/7").status_code, 204)
        row = ClientError.objects.get()
        self.assertEqual(row.count, 2)
        self.assertEqual(row.path, "/profiles/:id")
        self.report(message="Failed for maya@illinois.edu with token abcdefghijklmnopqrstuvwxyz123456 id 123456")
        scrubbed = ClientError.objects.exclude(pk=row.pk).get().message
        self.assertNotIn("maya@illinois.edu", scrubbed)
        self.assertNotIn("abcdefghijklmnopqrstuvwxyz", scrubbed)
        self.assertNotIn("123456", scrubbed)
        self.assertIn("[email]", scrubbed)

    def test_reporting_can_be_switched_off(self):
        with override_settings(CLIENT_ERROR_REPORTING=False):
            self.assertEqual(self.report().status_code, 204)
        self.assertEqual(ClientError.objects.count(), 0)

    def test_reports_are_validated_and_throttled(self):
        self.assertEqual(self.browser.post(reverse("client-errors"), {}, content_type="application/json").status_code, 400)
        with patch("common.client_errors.ClientErrorThrottle.get_rate", return_value="2/hour"):
            cache.clear()
            self.assertEqual(self.report().status_code, 204)
            self.assertEqual(self.report().status_code, 204)
            self.assertEqual(self.report().status_code, 429)


class LaunchMetricTests(SwapFixture):
    def setUp(self):
        super().setUp()
        self.peer_user, self.peer = self.member("peer", teaches=[self.figma], goals=[self.python], public_goals=True)
        User.objects.filter(pk__in=[self.me.pk, self.peer_user.pk]).update(has_completed_onboarding=True, date_joined=timezone.now() - timedelta(days=10))
        self.member("unfinished", teaches=[], goals=[])

    def test_first_match_is_recorded_once(self):
        self.client.get(reverse("discovery-swaps"))
        self.client.get(reverse("discovery-recommended"))
        self.assertEqual(AnalyticsEvent.objects.filter(event_type="matches_shown", user=self.me).count(), 1)

    def test_funnel_and_request_outcomes(self):
        now = timezone.now()
        joined = now - timedelta(days=10)
        accepted = HelpRequest.objects.create(seeker=self.me, helper_profile=self.peer, topic="A", message="Hi", related_skill=self.figma, kind="swap", offered_skill=self.python, status="completed")
        HelpRequest.objects.filter(pk=accepted.pk).update(created_at=joined + timedelta(days=1), accepted_at=joined + timedelta(days=1, hours=4))
        declined = HelpRequest.objects.create(seeker=self.me, helper_profile=self.peer, topic="B", message="Hi", related_skill=self.figma, status="declined")
        HelpRequest.objects.filter(pk=declined.pk).update(created_at=joined + timedelta(days=2), declined_at=joined + timedelta(days=2, hours=2))
        Review.objects.create(help_request=accepted, profile=self.peer, reviewer=self.me, rating=5, related_skill=self.figma)
        Review.objects.create(help_request=accepted, profile=self.mine, reviewer=self.peer_user, rating=4, related_skill=self.python)
        AnalyticsEvent.objects.create(user=self.me, event_type="matches_shown")
        AnalyticsEvent.objects.filter(user=self.me).update(created_at=joined + timedelta(hours=2))
        metrics = launch_metrics(now=now)
        self.assertEqual(metrics["signups"], 3)
        self.assertEqual(metrics["setup_completion_rate"], 0.667)
        self.assertAlmostEqual(metrics["median_minutes_to_first_match"], 120.0, delta=0.2)
        self.assertEqual(metrics["sent_request_cohort"], 2)
        self.assertEqual(metrics["sent_request_within_7_days_rate"], 0.5)
        self.assertEqual(metrics["acceptance_rate"], 0.5)
        self.assertEqual(metrics["median_response_hours"], 3.0)
        self.assertEqual(metrics["completion_rate"], 1.0)
        self.assertEqual(metrics["feedback_rate"], 1.0)
        self.assertEqual(metrics["two_sided_swap_feedback_rate"], 1.0)

    def test_empty_network_reports_unknown_not_zero(self):
        HelpRequest.objects.all().delete()
        metrics = launch_metrics()
        self.assertIsNone(metrics["acceptance_rate"])
        self.assertIsNone(metrics["median_response_hours"])

    def test_only_staff_see_launch_metrics(self):
        self.assertNotIn("launch_metrics", self.client.get(reverse("analytics-summary")).data)
        User.objects.filter(pk=self.me.pk).update(is_staff=True)
        self.me.refresh_from_db()
        self.client.force_authenticate(self.me)
        self.assertIn("setup_completion_rate", self.client.get(reverse("analytics-summary")).data["launch_metrics"])


class SeoTests(SwapFixture):
    def test_robots_and_sitemap_list_only_public_pages(self):
        with override_settings(APP_PUBLIC_URL="https://skillshare.example"):
            robots = self.client.get("/robots.txt").content.decode()
            sitemap = self.client.get("/sitemap.xml").content.decode()
        self.assertIn("Disallow: /api/", robots)
        self.assertIn("Disallow: /profiles/", robots)
        self.assertIn("Sitemap: https://skillshare.example/sitemap.xml", robots)
        self.assertIn("<loc>https://skillshare.example/privacy</loc>", sitemap)
        self.assertNotIn("/home", sitemap)

    def test_index_gets_absolute_social_urls_and_private_pages_are_noindex(self):
        with tempfile.TemporaryDirectory() as dist:
            (Path(dist) / "index.html").write_text('<meta property="og:image" content="__APP_PUBLIC_URL__/og-image.png">')
            with override_settings(APP_PUBLIC_URL="https://skillshare.example", WHITENOISE_ROOT=dist):
                landing = self.client.get("/")
                private = self.client.get("/requests/4")
        self.assertIn(b"https://skillshare.example/og-image.png", landing.content)
        self.assertNotIn("X-Robots-Tag", landing.headers)
        self.assertEqual(private["X-Robots-Tag"], "noindex")
