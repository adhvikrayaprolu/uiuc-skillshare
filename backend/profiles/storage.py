"""Private avatars stay behind Django's authorization boundary; no public URLs."""
import re
from io import BytesIO
from urllib.parse import quote, urlparse
import requests
from django.conf import settings
from django.core.exceptions import ImproperlyConfigured, SuspiciousFileOperation
from django.core.files.base import File
from django.core.files.storage import Storage
from django.urls import reverse


class StorageUnavailable(OSError):
    pass


class SupabasePrivateAvatarStorage(Storage):
    def __init__(self):
        url = urlparse(settings.SUPABASE_URL)
        if url.scheme != 'https' or not url.hostname or not url.hostname.endswith('.supabase.co') or url.username or url.port or url.path or url.query or url.fragment:
            raise ImproperlyConfigured('Set an HTTPS Supabase project origin without credentials or a path.')
        if not settings.SUPABASE_STORAGE_KEY or not re.fullmatch(r'[a-zA-Z0-9_-]+', settings.SUPABASE_AVATAR_BUCKET):
            raise ImproperlyConfigured('Configure the server-only storage key and private avatar bucket.')
        self.base = settings.SUPABASE_URL.rstrip('/') + '/storage/v1'
        self.bucket = settings.SUPABASE_AVATAR_BUCKET
        self.headers = {'apikey': settings.SUPABASE_STORAGE_KEY}
        # Legacy service-role JWTs require Authorization; new sb_secret keys use apikey.
        if settings.SUPABASE_STORAGE_KEY.startswith('eyJ'):
            self.headers['Authorization'] = 'Bearer ' + settings.SUPABASE_STORAGE_KEY

    def _name(self, name):
        if not re.fullmatch(r'profile_pictures/[0-9a-f]{32}\.jpg', name):
            raise SuspiciousFileOperation('Only normalized avatar object keys are accepted.')
        return name

    def _request(self, method, path, **kwargs):
        try:
            response = requests.request(method, self.base+path, headers=self.headers | kwargs.pop('headers', {}), timeout=(3, 5), allow_redirects=False, **kwargs)
        except requests.RequestException:
            raise StorageUnavailable('Avatar storage is unavailable.') from None
        if response.status_code not in {200, 201, 204, 404}:
            raise StorageUnavailable('Avatar storage did not accept the operation.')
        return response

    def _private(self):
        response = self._request('GET', '/bucket/'+quote(self.bucket))
        try:
            private = response.status_code == 200 and response.json().get('public') is False
        except (ValueError, AttributeError):
            private = False
        if not private:
            raise StorageUnavailable('The configured avatar bucket must exist and remain private.')

    def _object(self, name, authenticated=False):
        return '/object/'+('authenticated/' if authenticated else '')+quote(self.bucket)+'/'+quote(self._name(name), safe='/')

    def exists(self, name):
        self._private()
        return self._request('HEAD', '/object/info/'+quote(self.bucket)+'/'+quote(self._name(name), safe='/')).status_code != 404

    def get_available_name(self, name, max_length=None):
        # UUID keys never overwrite an existing avatar.
        self._name(name)
        if self.exists(name):
            import uuid
            return f'profile_pictures/{uuid.uuid4().hex}.jpg'
        return name

    def _save(self, name, content):
        self._private()
        data = content.read(2*1024*1024+1)
        if len(data) > 2*1024*1024:
            raise SuspiciousFileOperation('Normalized avatar exceeds the size limit.')
        response = self._request('POST', self._object(name), data=data, headers={'Content-Type':'image/jpeg','x-upsert':'false'})
        if response.status_code not in {200,201}:
            raise StorageUnavailable('Avatar upload failed.')
        return name

    def _open(self, name, mode='rb'):
        if mode != 'rb':
            raise ValueError('Avatars are read-only through open().')
        self._private()
        response = self._request('GET', self._object(name, authenticated=True))
        if response.status_code == 404:
            raise FileNotFoundError(name)
        if len(response.content) > 2*1024*1024:
            raise StorageUnavailable('Stored avatar exceeds the size limit.')
        return File(BytesIO(response.content), name=name)

    def delete(self, name):
        self._private()
        self._name(name)
        self._request('DELETE', '/object/'+quote(self.bucket), json={'prefixes':[name]})

    def url(self, name):
        from .models import StudentProfile
        self._name(name)
        pk=StudentProfile.objects.filter(profile_picture=name).values_list('pk', flat=True).first()
        return reverse('avatar-detail', args=[pk or 0])
