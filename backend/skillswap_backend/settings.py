from pathlib import Path
import os
import re
from urllib.parse import urlparse
from django.core.exceptions import ImproperlyConfigured

import dj_database_url
from dotenv import load_dotenv


BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR / ".env")

DEBUG = os.getenv("DEBUG", "False").lower() == "true"
ENVIRONMENT = os.getenv("ENVIRONMENT", "local" if DEBUG else "production")
LOCAL_DEVELOPMENT = ENVIRONMENT == "local"
SECRET_KEY = os.getenv("SECRET_KEY", "")
if not SECRET_KEY and LOCAL_DEVELOPMENT:
    SECRET_KEY = "dev-only-local-secret-key-change-before-production-12345"
if not SECRET_KEY or (not LOCAL_DEVELOPMENT and (len(SECRET_KEY) < 32 or SECRET_KEY.startswith(("dev-only", "REPLACE", "replace", "change-me")))):
    raise ImproperlyConfigured("Configure a private SECRET_KEY of at least 32 characters; ENVIRONMENT=local is required for local development defaults.")
SESSION_COOKIE_SECURE = not LOCAL_DEVELOPMENT
CSRF_COOKIE_SECURE = not LOCAL_DEVELOPMENT
ALLOWED_HOSTS = [h.strip() for h in os.getenv("ALLOWED_HOSTS", "localhost,127.0.0.1").split(",") if h.strip()]

INSTALLED_APPS = [
    "django.contrib.admin",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "allauth",
    "allauth.account",
    "allauth.socialaccount",
    "allauth.socialaccount.providers.google",
    "allauth.headless",
    "drf_spectacular",
    "corsheaders",
    "django_filters",
    "accounts",
    "taxonomy",
    "profiles",
    "interactions",
    "discovery",
    "common",
    "django_rq",
]

MIDDLEWARE = [
    "corsheaders.middleware.CorsMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "whitenoise.middleware.WhiteNoiseMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "allauth.account.middleware.AccountMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]

ROOT_URLCONF = "skillswap_backend.urls"

TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ],
        },
    }
]

WSGI_APPLICATION = "skillswap_backend.wsgi.application"

DATABASE_URL = os.getenv("DATABASE_URL", "")
DB_MIGRATION_ROLE = os.getenv("DB_MIGRATION_ROLE", "")
if DB_MIGRATION_ROLE and not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", DB_MIGRATION_ROLE):
    raise ImproperlyConfigured("DB_MIGRATION_ROLE must be a simple role name.")
DB_SCHEMA = os.getenv("DB_SCHEMA", "public")
DB_SSLMODE = os.getenv("DB_SSLMODE", "disable" if LOCAL_DEVELOPMENT else "verify-full")
if not re.fullmatch(r"[a-z][a-z0-9_]{0,62}", DB_SCHEMA):
    raise ImproperlyConfigured("DB_SCHEMA must be a simple lowercase schema name.")
if DB_SSLMODE not in {"disable", "require", "verify-ca", "verify-full"}:
    raise ImproperlyConfigured("Unsupported DB_SSLMODE.")
if not LOCAL_DEVELOPMENT and (not DATABASE_URL.startswith(("postgresql://", "postgres://")) or DB_SSLMODE != "verify-full"):
    raise ImproperlyConfigured("Production requires PostgreSQL and certificate-verified TLS (DB_SSLMODE=verify-full).")
if DATABASE_URL:
    DATABASES = {"default": dj_database_url.parse(DATABASE_URL, conn_max_age=int(os.getenv("DB_CONN_MAX_AGE", "30")), conn_health_checks=True)}
    DATABASES["default"].setdefault("OPTIONS", {}).update(sslmode=DB_SSLMODE, connect_timeout=5, options=f"-c search_path={DB_SCHEMA},public,extensions -c statement_timeout=15000")
    if DB_MIGRATION_ROLE:
        DATABASES["default"]["OPTIONS"]["options"] += f" -c role={DB_MIGRATION_ROLE}"
    if os.getenv("DB_SSLROOTCERT"):
        DATABASES["default"]["OPTIONS"]["sslrootcert"] = os.environ["DB_SSLROOTCERT"]
else:
    DATABASES = {"default": {"ENGINE": "django.db.backends.sqlite3", "NAME": BASE_DIR / "db.sqlite3"}}

AUTH_USER_MODEL = "accounts.User"

AUTH_PASSWORD_VALIDATORS = [
    {"NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"},
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]

LANGUAGE_CODE = "en-us"
TIME_ZONE = "America/Chicago"
USE_I18N = True
USE_TZ = True

STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
WHITENOISE_ROOT = BASE_DIR / "frontend_dist"
MEDIA_URL = "/media/"
MEDIA_ROOT = Path(os.getenv("MEDIA_ROOT", str(BASE_DIR / "media")))
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

CORS_ALLOWED_ORIGINS = [
    origin.strip()
    for origin in os.getenv(
        "CORS_ALLOWED_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
    ).split(",")
    if origin.strip()
]

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": ("accounts.authentication.MemberSessionAuthentication",),
    "DEFAULT_PERMISSION_CLASSES": ("rest_framework.permissions.IsAuthenticated",),
    "DEFAULT_FILTER_BACKENDS": ("django_filters.rest_framework.DjangoFilterBackend",),
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 20,
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_THROTTLE_CLASSES": (
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ),
    "DEFAULT_THROTTLE_RATES": {
        "anon": "100/day",
        "user": "1000/day",
        "auth_google": "10/min",
    },
}

GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
FILE_UPLOAD_MAX_MEMORY_SIZE = 5 * 1024 * 1024

SPECTACULAR_SETTINGS = {
    "TITLE": "Illini SkillSwap API",
    "DESCRIPTION": "Backend API for a UIUC student peer networking and skill-sharing platform.",
    "VERSION": "1.0.0",
    "SERVE_INCLUDE_SCHEMA": False,
    "ENUM_NAME_OVERRIDES": {"ContactTypeEnum": "profiles.schema.CONTACT_CHOICES", "ProfileVisibilityEnum": "profiles.schema.PROFILE_VISIBILITY_CHOICES", "CredentialVisibilityEnum": "profiles.schema.CREDENTIAL_VISIBILITY_CHOICES"},
}

REDIS_URL = os.getenv("REDIS_URL", "")
if REDIS_URL:
    CACHES = {"default": {"BACKEND": "django_redis.cache.RedisCache", "LOCATION": REDIS_URL, "OPTIONS": {"CLIENT_CLASS": "django_redis.client.DefaultClient", "SOCKET_CONNECT_TIMEOUT": 3, "SOCKET_TIMEOUT": 3}, "KEY_PREFIX": "skillshare"}}
RQ_QUEUES = {"default": {"URL": REDIS_URL or "redis://127.0.0.1:6379/0", "DEFAULT_TIMEOUT": 60}}
EMAIL_BACKEND = "django.core.mail.backends.smtp.EmailBackend" if os.getenv("EMAIL_HOST") else "django.core.mail.backends.console.EmailBackend"
EMAIL_HOST = os.getenv("EMAIL_HOST", "localhost")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "1025"))
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "False").lower() == "true"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "SkillShare <noreply@localhost>")

AUTHENTICATION_BACKENDS = ["django.contrib.auth.backends.ModelBackend", "allauth.account.auth_backends.AuthenticationBackend"]
ACCOUNT_ADAPTER = "accounts.adapters.AccountAdapter"
SOCIALACCOUNT_ADAPTER = "accounts.adapters.SocialAdapter"
ACCOUNT_USER_MODEL_USERNAME_FIELD = None
ACCOUNT_LOGIN_METHODS = {"email"}
ACCOUNT_SIGNUP_FIELDS = ["email*"]
ACCOUNT_EMAIL_VERIFICATION = "mandatory"
ACCOUNT_LOGIN_BY_CODE_ENABLED = True
ACCOUNT_LOGIN_BY_CODE_TIMEOUT = 300
ACCOUNT_LOGIN_BY_CODE_MAX_ATTEMPTS = 3
ACCOUNT_LOGIN_BY_CODE_MAX_RESEND_COUNT = 3
ACCOUNT_RATE_LIMITS = {"request_login_code": "3/m/ip,5/10m/key", "login": "10/m/ip"}
SOCIALACCOUNT_EMAIL_AUTHENTICATION = False
SOCIALACCOUNT_EMAIL_AUTHENTICATION_AUTO_CONNECT = False
SOCIALACCOUNT_PROVIDERS = {"google": {"APPS": [{"client_id": GOOGLE_CLIENT_ID, "secret": os.getenv("GOOGLE_CLIENT_SECRET", ""), "key": ""}]}}
HEADLESS_ONLY = True
HEADLESS_CLIENTS = ("browser",)
HEADLESS_FRONTEND_URLS = {"account_signup": "/login", "account_login": "/login", "account_reset_password": "/login", "account_email_verification_sent": "/login"}
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 24
SESSION_EXPIRE_AT_BROWSER_CLOSE = True
CSRF_TRUSTED_ORIGINS = [x for x in os.getenv("CSRF_TRUSTED_ORIGINS", "http://localhost:8080,http://127.0.0.1:8080,http://localhost:5173,http://127.0.0.1:5173").split(",") if x]
CORS_ALLOW_CREDENTIALS = True

APP_PUBLIC_URL = os.getenv("APP_PUBLIC_URL", "http://localhost:8080").rstrip("/")
EMAIL_TIMEOUT = 10
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")

AI_PAID_CALLS_ENABLED = os.getenv('AI_PAID_CALLS_ENABLED', 'false').lower() == 'true'
AI_DAILY_CALL_LIMIT = int(os.getenv('AI_DAILY_CALL_LIMIT', '0'))

# Production uses a same-origin HTTPS frontend and an explicitly configured SMTP service.
SECURE_SSL_REDIRECT = not LOCAL_DEVELOPMENT
SECURE_HSTS_SECONDS = 31536000 if not LOCAL_DEVELOPMENT else 0
SECURE_HSTS_INCLUDE_SUBDOMAINS = os.getenv("HSTS_INCLUDE_SUBDOMAINS", "false").lower() == "true"
SECURE_HSTS_PRELOAD = os.getenv("HSTS_PRELOAD", "false").lower() == "true"
if os.getenv("TRUST_PROXY_HEADERS", "false").lower() == "true":
    SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
if not LOCAL_DEVELOPMENT:
    public_url = urlparse(APP_PUBLIC_URL)
    if DEBUG or public_url.scheme != "https" or not public_url.hostname or public_url.path or public_url.username:
        raise ImproperlyConfigured("Production requires DEBUG=False and an HTTPS APP_PUBLIC_URL origin.")
    if "*" in ALLOWED_HOSTS or public_url.hostname not in ALLOWED_HOSTS:
        raise ImproperlyConfigured("Include the exact APP_PUBLIC_URL host in ALLOWED_HOSTS; wildcards are not allowed.")
    if not REDIS_URL or not os.getenv("EMAIL_HOST"):
        raise ImproperlyConfigured("Production requires shared Redis and an SMTP delivery configuration.")
    CORS_ALLOWED_ORIGINS = []
    CSRF_TRUSTED_ORIGINS = [APP_PUBLIC_URL]

AVATAR_STORAGE = os.getenv("AVATAR_STORAGE", "local")
if AVATAR_STORAGE not in {"local", "supabase"}:
    raise ImproperlyConfigured("AVATAR_STORAGE must be local or supabase.")
STORAGES = {"default": {"BACKEND": "django.core.files.storage.FileSystemStorage"}, "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"}}
if AVATAR_STORAGE == "supabase":
    STORAGES["default"] = {"BACKEND": "profiles.storage.SupabasePrivateAvatarStorage"}
SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_STORAGE_KEY = os.getenv("SUPABASE_STORAGE_KEY", "")
SUPABASE_AVATAR_BUCKET = os.getenv("SUPABASE_AVATAR_BUCKET", "avatars")
