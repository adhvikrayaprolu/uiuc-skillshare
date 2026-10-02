from io import BytesIO
from unittest.mock import Mock, patch
import requests
from PIL import Image
from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation
from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import SimpleTestCase, override_settings
from django.urls import reverse
from rest_framework.test import APITestCase
from accounts.models import User
from common.models import AvatarDeletion
from .models import StudentProfile
from .storage import SupabasePrivateAvatarStorage, StorageUnavailable


@override_settings(SUPABASE_URL='https://fixture.supabase.co', SUPABASE_STORAGE_KEY='sb_secret_fixture_only', SUPABASE_AVATAR_BUCKET='avatars')
class PrivateStorageTests(SimpleTestCase):
    name = 'profile_pictures/' + 'a' * 32 + '.jpg'

    def response(self, code=200, public=False, content=b'fixture'):
        return Mock(status_code=code, content=content, json=Mock(return_value={'public': public}))

    @patch('profiles.storage.requests.request')
    def test_private_upload_read_delete_and_server_headers(self, request):
        storage = SupabasePrivateAvatarStorage()
        request.side_effect = [self.response(), self.response(404), self.response(), self.response(201), self.response(), self.response(content=b'jpeg'), self.response(), self.response()]
        self.assertEqual(storage.save(self.name, ContentFile(b'jpeg')), self.name)
        self.assertEqual(storage.open(self.name).read(), b'jpeg')
        storage.delete(self.name)
        calls = request.call_args_list
        self.assertIn('/object/info/avatars/', calls[1].args[1])
        self.assertEqual(calls[3].kwargs['headers']['x-upsert'], 'false')
        self.assertIn('/object/authenticated/avatars/', calls[5].args[1])
        self.assertEqual(calls[-1].kwargs['json'], {'prefixes': [self.name]})
        for call in calls:
            self.assertEqual(call.kwargs['headers']['apikey'], 'sb_secret_fixture_only')
            self.assertNotIn('Authorization', call.kwargs['headers'])
            self.assertEqual(call.kwargs['timeout'], (3, 5))
            self.assertFalse(call.kwargs['allow_redirects'])

    @patch('profiles.storage.requests.request')
    def test_public_bucket_and_provider_failure_fail_closed(self, request):
        storage = SupabasePrivateAvatarStorage()
        request.return_value = self.response(public=True)
        with self.assertRaises(StorageUnavailable):
            storage.open(self.name)
        self.assertEqual(request.call_count, 1)
        request.side_effect = requests.Timeout('provider details must remain private')
        with self.assertRaisesRegex(StorageUnavailable, '^Avatar storage is unavailable.$'):
            storage.delete(self.name)
        request.side_effect = None
        request.return_value = self.response(403)
        with self.assertRaises(StorageUnavailable):
            storage.exists(self.name)

    @patch('profiles.storage.requests.request')
    def test_path_size_and_missing_object_validation(self, request):
        storage = SupabasePrivateAvatarStorage()
        request.return_value = self.response()
        with self.assertRaises(SuspiciousFileOperation):
            storage.save('../secrets.env', ContentFile(b'bad'))
        with self.assertRaises(SuspiciousFileOperation):
            storage._save(self.name, ContentFile(b'x' * (2 * 1024 * 1024 + 1)))
        request.side_effect = [self.response(), self.response(404)]
        with self.assertRaises(FileNotFoundError):
            storage.open(self.name)
        with override_settings(SUPABASE_URL='http://localhost:8000'):
            with self.assertRaises(ImproperlyConfigured):
                SupabasePrivateAvatarStorage()
        with override_settings(SUPABASE_STORAGE_KEY='eyJ_fixture_only'):
            self.assertEqual(SupabasePrivateAvatarStorage().headers['Authorization'], 'Bearer eyJ_fixture_only')


class AvatarFailureTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user('storage@illinois.edu', is_student_verified=True)
        self.profile = StudentProfile.objects.create(user=self.user, display_name='Storage', major='CS', year='junior', headline='Help', bio='Bio', profile_picture='profile_pictures/'+'b'*32+'.jpg')
        self.client.force_authenticate(self.user)

    def test_upload_failure_preserves_old_avatar_and_returns_retryable_error(self):
        old = self.profile.profile_picture.name
        image = BytesIO(); Image.new('RGB', (10, 10)).save(image, format='PNG')
        with patch.object(self.profile.profile_picture.storage, 'save', side_effect=StorageUnavailable('private provider response')):
            response = self.client.post(reverse('avatar-upload'), {'avatar': SimpleUploadedFile('image.png', image.getvalue())}, format='multipart')
        self.assertEqual(response.status_code, 503)
        self.assertNotIn('private provider response', str(response.data))
        self.profile.refresh_from_db()
        self.assertEqual(self.profile.profile_picture.name, old)
        self.assertNotEqual(AvatarDeletion.objects.get().name, old)

    def test_download_failure_and_account_deletion_leave_durable_cleanup(self):
        old = self.profile.profile_picture.name
        with patch.object(self.profile.profile_picture.storage, 'open', side_effect=StorageUnavailable('private provider response')):
            self.assertEqual(self.client.get(reverse('avatar-detail', args=[self.profile.pk])).status_code, 503)
        response = self.client.post(reverse('account-delete'), {'confirmation': self.user.email}, format='json')
        self.assertEqual(response.status_code, 200)
        self.assertFalse(User.objects.filter(pk=self.user.pk).exists())
        self.assertEqual(AvatarDeletion.objects.get().name, old)
        self.assertEqual(self.client.get(reverse('avatar-detail', args=[self.profile.pk])).status_code, 404)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get(reverse('avatar-detail', args=[self.profile.pk])).status_code, 401)
