from .settings import *  # noqa: F403

# Isolate test caches from the running app and worker. PostgreSQL test databases
# remain managed by Django, including transaction/concurrency tests.
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]
EMAIL_BACKEND = "django.core.mail.backends.locmem.EmailBackend"
