from django.urls import reverse
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
