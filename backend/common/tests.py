from django.urls import reverse
from django.test import SimpleTestCase
from rest_framework.test import APITestCase

from accounts.models import User
from profiles.models import StudentProfile


class HealthTests(APITestCase):
    def test_health_endpoint_works(self):
        response = self.client.get(reverse("health"))
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["status"], "ok")


class FrontendReadinessTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user("student@illinois.edu", "pw", is_student_verified=True)
        self.client.force_authenticate(self.user)

    def test_bootstrap_endpoint(self):
        StudentProfile.objects.create(user=self.user, display_name="Student", major="CS", year="junior", headline="Help", bio="Bio")
        response = self.client.get(reverse("bootstrap"))
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.data["has_profile"])
        self.assertIn("skill_categories", response.data)
        self.assertIn("dashboard", response.data)

    def test_onboarding_status_endpoint(self):
        response = self.client.get(reverse("onboarding-status"))
        self.assertEqual(response.status_code, 200)
        self.assertFalse(response.data["has_profile"])
        self.assertIn("create_profile", response.data["missing_steps"])


class ProductionConfigurationTests(SimpleTestCase):
    def run_settings(self, secret, **overrides):
        import os
        import subprocess
        import sys
        from django.conf import settings
        return subprocess.run([sys.executable, 'manage.py', 'check'], cwd=settings.BASE_DIR,
                              env={**os.environ, 'DEBUG': 'False', 'ENVIRONMENT': 'production', 'SECRET_KEY': secret, 'DATABASE_URL':'postgresql://runtime:configuration-only@localhost:5432/skillshare', 'DB_SSLMODE':'verify-full', 'APP_PUBLIC_URL':'https://skillshare.example.invalid', 'ALLOWED_HOSTS':'skillshare.example.invalid', 'REDIS_URL':'redis://localhost:6379/0', 'EMAIL_HOST':'smtp.example.invalid', **overrides},
                              capture_output=True, text=True)

    def test_production_requires_private_key(self):
        for key in ['', 'short', 'dev-only-local-secret-key-change-before-production-12345']:
            result = self.run_settings(key)
            self.assertNotEqual(result.returncode, 0)
            self.assertIn('Configure a private SECRET_KEY', result.stderr)

    def test_private_production_key_passes_system_check(self):
        self.assertEqual(self.run_settings('test-only-configuration-key-1234567890').returncode, 0)

    def test_production_rejects_insecure_or_incomplete_configuration(self):
        for overrides in [{'DEBUG':'True'}, {'DB_SSLMODE':'disable'}, {'APP_PUBLIC_URL':'http://localhost'}, {'ALLOWED_HOSTS':'*'}, {'REDIS_URL':''}, {'EMAIL_HOST':''}, {'DB_SCHEMA':'public;unsafe'}, {'DB_MIGRATION_ROLE':'bad role'}]:
            self.assertNotEqual(self.run_settings('test-only-configuration-key-1234567890', **overrides).returncode, 0)


class ReadinessTests(APITestCase):
    def test_readiness_and_liveness_distinguish_database_failure(self):
        from unittest.mock import patch
        self.assertEqual(self.client.get(reverse("readiness")).status_code, 200)
        with patch("django.db.connection.cursor", side_effect=RuntimeError("database unavailable")):
            self.assertEqual(self.client.get(reverse("readiness")).status_code, 503)
            self.assertEqual(self.client.get(reverse("liveness")).status_code, 200)

    def test_taxonomy_seed_never_creates_members(self):
        from django.core.management import call_command
        from taxonomy.models import SkillTag
        call_command("seed_taxonomy", verbosity=0)
        count = SkillTag.objects.count()
        call_command("seed_taxonomy", verbosity=0)
        self.assertEqual(SkillTag.objects.count(), count)
        self.assertEqual(User.objects.count(), 0)
