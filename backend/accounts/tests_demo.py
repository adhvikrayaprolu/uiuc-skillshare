from io import StringIO

from django.core.management import call_command as django_call_command
from django.core.management.base import CommandError
from django.test import Client, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from common.models import Notification
from interactions.models import HelpRequest, Review
from .demo import DEMO_EMAIL, DEMO_SUFFIX, MEMBERS, STAFF_EMAIL
from .models import User


def call_command(*args):
    django_call_command(*args, stdout=StringIO())


@override_settings(DEMO_MODE=False)
class DemoDisabledTests(APITestCase):
    def test_demo_sign_in_and_seeding_do_not_exist_when_demo_mode_is_off(self):
        self.assertFalse(Client().get(reverse("auth-csrf")).json()["demoEnabled"])
        self.assertEqual(Client().post(reverse("auth-demo")).status_code, 404)
        with self.assertRaises(CommandError):
            call_command("seed_demo")
        call_command("seed_demo", "--if-enabled")
        self.assertFalse(User.objects.filter(email__endswith=DEMO_SUFFIX).exists())


@override_settings(DEMO_MODE=True)
class DemoNetworkTests(APITestCase):
    def setUp(self):
        call_command("seed_taxonomy")
        call_command("seed_demo")
        self.browser = Client(enforce_csrf_checks=True)

    def sign_in(self, query=""):
        token = self.browser.get(reverse("auth-csrf")).json()["csrfToken"]
        return self.browser.post(reverse("auth-demo") + query, HTTP_X_CSRFTOKEN=token)

    def test_seed_is_idempotent_and_reset_rebuilds_the_same_network(self):
        counts = (User.objects.count(), HelpRequest.objects.count(), Review.objects.count())
        call_command("seed_demo")
        self.assertEqual((User.objects.count(), HelpRequest.objects.count(), Review.objects.count()), counts)
        call_command("seed_demo", "--reset")
        self.assertEqual((User.objects.count(), HelpRequest.objects.count(), Review.objects.count()), counts)
        self.assertEqual(User.objects.filter(email__endswith=DEMO_SUFFIX).count(), len(MEMBERS) + 1)

    def test_demo_sign_in_requires_csrf_and_post(self):
        self.assertEqual(self.browser.post(reverse("auth-demo")).status_code, 403)
        self.assertEqual(self.browser.get(reverse("auth-demo")).status_code, 405)
        self.assertTrue(self.browser.get(reverse("auth-csrf")).json()["demoEnabled"])

    def test_demo_member_sees_a_lived_in_network(self):
        response = self.sign_in()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"]["email"], DEMO_EMAIL)
        self.assertEqual(self.browser.get(reverse("auth-me")).json()["email"], DEMO_EMAIL)
        swaps = {row["display_name"] for row in self.browser.get(reverse("discovery-swaps")).json()["results"]}
        self.assertTrue({"Sam Okafor", "Priya Natarajan", "Jordan Lee"} <= swaps)
        needs_action = self.browser.get(reverse("help-requests-list"), {"bucket": "needs_action"}).json()["results"]
        self.assertEqual({row["topic"] for row in needs_action}, {
            "Speech practice for help reading survey data", "Debugging my first Python project", "Eigenvalues before the midterm"})
        self.assertGreater(self.browser.get(reverse("discovery-search")).json()["count"], 10)
        self.assertEqual(Notification.objects.filter(recipient__email=DEMO_EMAIL, read_at__isnull=True).count(), 2)

    def test_staff_demo_account_can_open_launch_metrics(self):
        self.assertEqual(self.sign_in("?account=staff").json()["user"]["email"], STAFF_EMAIL)
        self.assertEqual(self.browser.get(reverse("admin-analytics-summary")).status_code, 200)

    def test_unseeded_database_explains_how_to_seed(self):
        User.objects.filter(email__endswith=DEMO_SUFFIX).delete()
        self.assertEqual(self.sign_in().status_code, 503)
