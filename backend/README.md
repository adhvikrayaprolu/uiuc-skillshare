# Backend

Django REST API for Illini SkillSwap.

## Structure

```text
backend/
├── accounts/           # Custom user model, JWT auth, local dev-login
├── common/             # Health check, bootstrap, dashboard, analytics helpers
├── discovery/          # Search, ranking, local semantic matcher
├── interactions/       # Saved profiles, help requests, reviews, endorsements
├── profiles/           # Student profiles, skills, availability, contacts, credentials
├── skillswap_backend/  # Django settings, URLs, ASGI/WSGI
├── taxonomy/           # Skill categories, tags, demo seed data
├── docs/               # API contract and demo script
├── manage.py
└── requirements.txt
```

## Environment

Copy local env file:

```bash
cp backend/.env.example backend/.env
```

Main variables:

- `SECRET_KEY`: Django secret key.
- `DEBUG`: `True` for local development.
- `ALLOWED_HOSTS`: comma-separated host list.
- `CORS_ALLOWED_ORIGINS`: frontend origins allowed by Django CORS.
- `DATABASE_URL`: optional PostgreSQL URL. Leave blank for SQLite.
- `GOOGLE_CLIENT_ID`: Google OAuth client ID for Illinois sign-in.
- `OPENAI_API_KEY`: optional, reserved for AI-related experiments.
- `DJANGO_SUPERUSER_EMAIL`: helper value for local admin setup.
- `DJANGO_SUPERUSER_PASSWORD`: helper value for local admin setup.

Real `.env` files are local only and gitignored. Do not commit secrets.

## Run

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
cp backend/.env.example backend/.env
cd backend
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo_data
.venv/bin/python manage.py runserver 127.0.0.1:8000
```

Useful URLs:

- API health: `http://127.0.0.1:8000/api/health/`
- API docs: `http://127.0.0.1:8000/api/docs/`
- Django admin: `http://127.0.0.1:8000/admin/`

## Validation

```bash
cd backend
.venv/bin/python manage.py makemigrations --check
.venv/bin/python manage.py check
.venv/bin/python manage.py test
```

## Auth Notes

`POST /api/auth/dev-login/` exists for local demo only when `DEBUG=True`. It accepts `@illinois.edu` emails and returns JWT access/refresh tokens.

Production should replace dev-login with Illinois Google OAuth/SSO.
