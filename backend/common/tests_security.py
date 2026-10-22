import tempfile
from pathlib import Path

from django.core.cache import cache
from django.test import Client, override_settings
from django.urls import reverse

from discovery.tests_swaps import SwapFixture
from .csp import content_security_policy


class SecurityHeaderTests(SwapFixture):
    def test_pages_and_api_send_a_strict_policy(self):
        with tempfile.TemporaryDirectory() as dist:
            (Path(dist) / "index.html").write_text("<html></html>")
            with override_settings(WHITENOISE_ROOT=dist):
                page = Client().get("/")
        api = self.client.get(reverse("discovery-search"))
        for response in (page, api):
            policy = response["Content-Security-Policy"]
            for directive in ("default-src 'self'", "frame-ancestors 'none'", "object-src 'none'", "base-uri 'self'", "form-action 'self'"):
                self.assertIn(directive, policy)
            self.assertNotIn("unsafe-inline", policy)
            self.assertNotIn("accounts.google.com", policy)
            self.assertIn("camera=()", response["Permissions-Policy"])

    def test_google_and_hosted_avatars_are_allowed_only_when_configured(self):
        policy = content_security_policy(google_sign_in=True, avatar_origin="https://project.supabase.co")
        self.assertIn("https://accounts.google.com/gsi/client", policy["script-src"])
        self.assertIn("https://accounts.google.com/gsi/", policy["frame-src"])
        self.assertIn("https://project.supabase.co", policy["img-src"])
        self.assertEqual(content_security_policy()["frame-src"], ["'none'"])

    def test_only_the_api_explorer_may_load_its_cdn(self):
        docs = self.client.get(reverse("swagger-ui"))
        self.assertIn("https://cdn.jsdelivr.net", docs["Content-Security-Policy"])
        self.assertNotIn("cdn.jsdelivr.net", self.client.get(reverse("discovery-search"))["Content-Security-Policy"])


class CreationLimitTests(SwapFixture):
    def setUp(self):
        super().setUp()
        cache.clear()
        _, self.target = self.member("target", teaches=[self.figma], goals=[])

    def report(self):
        return self.client.post(reverse("reports-list"), {"reported_profile": self.target.pk, "reason": "spam", "description": "Sent the same advert to everyone."}, format="json")

    def test_reports_are_limited_per_hour_without_blocking_reading(self):
        self.assertEqual({self.report().status_code for _ in range(10)}, {201})
        self.assertEqual(self.report().status_code, 429)
        self.assertEqual(self.client.get(reverse("discovery-search")).status_code, 200)
