"""Offline production-settings rehearsal; never connects to hosted services."""
import os
import secrets
import subprocess
import sys

env = dict(os.environ, ENVIRONMENT='production', DEBUG='False', SECRET_KEY=secrets.token_urlsafe(64), APP_PUBLIC_URL='https://skillshare.example.invalid', ALLOWED_HOSTS='skillshare.example.invalid', DATABASE_URL='postgresql://runtime:configuration-only@db:5432/skillshare', DB_SCHEMA='skillshare', DB_SSLMODE='verify-full', REDIS_URL='redis://redis:6379/0', EMAIL_HOST='smtp.example.invalid', EMAIL_PORT='587', EMAIL_USE_TLS='True', HSTS_INCLUDE_SUBDOMAINS='true', HSTS_PRELOAD='true', AVATAR_STORAGE='local', AI_PAID_CALLS_ENABLED='false', AI_DAILY_CALL_LIMIT='0', OPENAI_API_KEY='')
subprocess.run([sys.executable, 'manage.py', 'check', '--deploy', '--fail-level', 'WARNING'], env=env, check=True)
subprocess.run([sys.executable, '-c', "import os; os.environ['DJANGO_SETTINGS_MODULE']='skillswap_backend.settings'; import django; django.setup(); from django.conf import settings; from django.urls import resolve, Resolver404; assert settings.SESSION_COOKIE_SECURE and settings.CSRF_COOKIE_SECURE and settings.SESSION_COOKIE_HTTPONLY; assert not settings.DEBUG and not settings.AI_PAID_CALLS_ENABLED and settings.AI_DAILY_CALL_LIMIT == 0; assert settings.DATABASES['default']['OPTIONS']['sslmode'] == 'verify-full'; print('Production cookie/TLS/AI defaults verified; hosted connectivity is unverified.')"], env=env, check=True)
