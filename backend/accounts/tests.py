import time
from unittest.mock import patch
from django.core import mail
from django.core.cache import cache
from django.test import Client, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from allauth.socialaccount.providers.oauth2.client import OAuth2Error
from .models import User


@override_settings(EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend')
class SessionIdentityTests(APITestCase):
    def setUp(self):
        cache.clear()
        self.browser = Client(enforce_csrf_checks=True)
        self.csrf = self.browser.get(reverse('auth-csrf')).json()['csrfToken']

    def post(self, name, data):
        return self.browser.post(reverse(name), data, content_type='application/json', HTTP_X_CSRFTOKEN=self.csrf)

    def request_code(self, email='student@illinois.edu'):
        with patch('allauth.account.adapter.DefaultAccountAdapter.generate_login_code', return_value='ABC123'):
            return self.post('email-code-request', {'email': email})

    def sign_in(self):
        self.assertEqual(self.request_code().status_code, 401)
        response = self.post('email-code-confirm', {'code': 'ABC123'})
        self.assertEqual(response.status_code, 200, response.content)
        self.csrf = self.browser.get(reverse('auth-csrf')).json()['csrfToken']

    def test_email_verification_session_and_server_logout(self):
        self.sign_in()
        self.assertTrue(User.objects.get(email='student@illinois.edu').is_student_verified)
        self.assertIn('ABC123', mail.outbox[0].body)
        self.assertEqual(self.browser.get(reverse('auth-me')).status_code, 200)
        key = self.browser.session.session_key
        self.assertEqual(self.post('auth-logout', {}).status_code, 200)
        self.assertEqual(self.browser.get(reverse('auth-me')).status_code, 401)
        from django.contrib.sessions.models import Session
        self.assertFalse(Session.objects.filter(session_key=key).exists())

    def test_codes_cannot_be_replayed(self):
        self.sign_in()
        self.assertEqual(self.post('email-code-confirm', {'code': 'ABC123'}).status_code, 409)

    def test_expiry_and_three_failed_attempts(self):
        self.request_code()
        with patch('allauth.account.internal.flows.code_verification.time.time', return_value=time.time() + 301):
            self.assertEqual(self.post('email-code-confirm', {'code': 'ABC123'}).status_code, 409)
        self.request_code()
        for _ in range(3):
            self.assertEqual(self.post('email-code-confirm', {'code': 'WRONG'}).status_code, 400)
        self.assertEqual(self.post('email-code-confirm', {'code': 'ABC123'}).status_code, 409)
        self.assertFalse(User.objects.get(email='student@illinois.edu').is_student_verified)

    def test_domain_csrf_and_request_throttle(self):
        self.assertEqual(self.browser.post(reverse('email-code-request'), {'email': 's@illinois.edu'}, content_type='application/json').status_code, 403)
        self.assertEqual(self.request_code('student@gmail.com').status_code, 400)
        self.assertFalse(User.objects.filter(email='student@gmail.com').exists())
        cache.clear()
        for _ in range(3):
            self.assertEqual(self.request_code().status_code, 401)
        self.assertEqual(self.request_code().status_code, 400)

    def test_suspended_and_demo_accounts_cannot_sign_in(self):
        for flags in [{'is_active': False}, {'is_demo': True}]:
            cache.clear()
            User.objects.filter(email='student@illinois.edu').delete()
            User.objects.create_user('student@illinois.edu', **flags)
            self.request_code()
            self.assertNotEqual(self.post('email-code-confirm', {'code': 'ABC123'}).status_code, 200)

    def test_unverified_and_inactive_sessions_cannot_access_members(self):
        user = User.objects.create_user('unverified@illinois.edu')
        self.browser.force_login(user)
        self.assertEqual(self.browser.get(reverse('auth-me')).status_code, 401)
        user.is_student_verified = True
        user.is_active = False
        user.save()
        self.assertEqual(self.browser.get(reverse('auth-me')).status_code, 401)

    def test_developer_login_and_refresh_are_absent(self):
        self.assertEqual(self.client.post('/api/auth/dev-login/', {}).status_code, 404)
        self.assertEqual(self.client.post('/api/auth/token/refresh/', {}).status_code, 404)


@override_settings(GOOGLE_CLIENT_ID='fixture-client', SOCIALACCOUNT_PROVIDERS={'google': {'APPS': [{'client_id': 'fixture-client', 'secret': '', 'key': ''}]}})
class GoogleIdentityTests(APITestCase):
    setUp = SessionIdentityTests.setUp
    post = SessionIdentityTests.post

    def google(self, **changes):
        payload = {'sub': 'fixture-google-sub', 'email': 'google@illinois.edu', 'email_verified': True, 'hd': 'illinois.edu', 'aud': 'fixture-client', 'iss': 'https://accounts.google.com', 'exp': int(time.time()) + 300}
        payload.update(changes)
        with patch('allauth.socialaccount.providers.google.views._verify_and_decode', return_value=payload) as decoder:
            response = self.post('google-auth', {'provider': 'google', 'process': 'login', 'token': {'client_id': 'fixture-client', 'id_token': 'fixture-token'}})
            if decoder.called:
                self.assertEqual(decoder.call_args.kwargs['app'].client_id, 'fixture-client')
            return response

    def test_valid_identity_links_subject_and_session(self):
        response = self.google()
        self.assertEqual(response.status_code, 200, response.content)
        user = User.objects.get(email='google@illinois.edu')
        self.assertEqual(user.google_sub, 'fixture-google-sub')
        self.assertTrue(user.is_student_verified)
        self.assertEqual(self.browser.get(reverse('auth-me')).status_code, 200)

    def test_claim_boundaries_and_email_collision(self):
        for claims in [{'aud': 'wrong'}, {'email': 'x@gmail.com'}, {'email_verified': False}, {'hd': 'gmail.com'}, {'hd': None}]:
            cache.clear()
            self.assertIn(self.google(**claims).status_code, [403, 409])
        self.assertEqual(User.objects.count(), 0)
        User.objects.create_user('google@illinois.edu', is_student_verified=True)
        self.assertEqual(self.google().status_code, 409)

    def test_expired_or_invalid_signature_is_rejected_by_provider(self):
        with patch('allauth.socialaccount.providers.google.views._verify_and_decode', side_effect=OAuth2Error('invalid/expired token')):
            self.assertEqual(self.post('google-auth', {'provider': 'google', 'process': 'login', 'token': {'client_id': 'fixture-client', 'id_token': 'fixture-token'}}).status_code, 400)
        self.assertEqual(User.objects.count(), 0)

    @override_settings(GOOGLE_CLIENT_ID='')
    def test_missing_audience_disables_google(self):
        self.assertEqual(self.google().status_code, 503)


class GoogleSignatureVerificationTests(APITestCase):
    def test_real_signature_expiry_audience_and_issuer_validation_without_network(self):
        import jwt
        from types import SimpleNamespace
        from cryptography.hazmat.primitives.asymmetric import rsa
        from allauth.socialaccount.providers.google.views import _verify_and_decode
        private = rsa.generate_private_key(public_exponent=65537, key_size=2048)
        claims = {"aud": "fixture-client", "iss": "https://accounts.google.com", "exp": int(time.time()) + 300, "sub": "fixture-sub"}
        with patch("allauth.socialaccount.internal.jwtkit.fetch_key", return_value=("RS256", private.public_key())):
            token = jwt.encode(claims, private, algorithm="RS256", headers={"kid": "fixture"})
            self.assertEqual(_verify_and_decode(SimpleNamespace(client_id="fixture-client"), token)["sub"], "fixture-sub")
            for changes in [{"aud": "wrong"}, {"iss": "https://evil.invalid"}, {"exp": int(time.time()) - 60}]:
                token = jwt.encode({**claims, **changes}, private, algorithm="RS256", headers={"kid": "fixture"})
                with self.assertRaises(OAuth2Error):
                    _verify_and_decode(SimpleNamespace(client_id="fixture-client"), token)
            other = rsa.generate_private_key(public_exponent=65537, key_size=2048)
            token = jwt.encode(claims, other, algorithm="RS256", headers={"kid": "fixture"})
            with self.assertRaises(OAuth2Error):
                _verify_and_decode(SimpleNamespace(client_id="fixture-client"), token)
