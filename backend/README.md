# SkillShare backend

Django REST application for verified Illinois-email members. Follow the [root Docker quick start](../README.md); run `make check` at the root for the PostgreSQL baseline.

Domains: accounts (allauth sessions/CSRF), profiles (atomic edits/privacy/avatars), taxonomy (approved skills), discovery (bounded explainable retrieval), interactions (requests/feedback/blocks), common (notifications, outboxes, health and analytics).

[API contract](docs/frontend_api_contract.md) · [development](../docs/development.md) · [Supabase and recovery](../docs/operations.md).

`/api/docs/` provides the domain API explorer. `/api/auth/` also exposes the documented allauth browser-code/provider flows. JWT refresh and developer-login routes are absent. Never seed synthetic members into a real member database.
