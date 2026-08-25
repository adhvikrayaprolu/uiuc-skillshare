from unittest.mock import patch

from django.test import override_settings
from django.urls import reverse
from rest_framework.test import APITestCase

from .models import User


class AccountsTests(APITestCase):
    def test_create_custom_user(self):
        user = User.objects.create_user(email="student@illinois.edu", password="pw")
        self.assertEqual(user.email, "student@illinois.edu")
        self.assertTrue(user.check_password("pw"))

    @patch("accounts.serializers.google_id_token.verify_oauth2_token")
    def test_invalid_google_domain_rejected(self, mock_verify):
        mock_verify.return_value = {"email": "student@gmail.com", "sub": "abc"}
        response = self.client.post(reverse("google-auth"), {"id_token": "token"}, format="json")
        self.assertEqual(response.status_code, 403)

    @override_settings(DEBUG=True)
    def test_dev_login_returns_tokens_when_debug(self):
        response = self.client.post(reverse("dev-login"), {"email": "adhvik.rayaprolu@illinois.edu"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.assertIn("access", response.data)
        self.assertIn("refresh", response.data)
        self.assertEqual(response.data["user"]["email"], "adhvik.rayaprolu@illinois.edu")
        self.assertTrue(User.objects.filter(email="adhvik.rayaprolu@illinois.edu").exists())

    @override_settings(DEBUG=False)
    def test_dev_login_hidden_when_not_debug(self):
        response = self.client.post(reverse("dev-login"), {"email": "adhvik.rayaprolu@illinois.edu"}, format="json")
        self.assertEqual(response.status_code, 404)

    @override_settings(DEBUG=True)
    def test_dev_login_rejects_non_illinois(self):
        response = self.client.post(reverse("dev-login"), {"email": "x@gmail.com"}, format="json")
        self.assertEqual(response.status_code, 400)
