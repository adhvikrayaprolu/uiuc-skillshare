# UIUC SkillShare

Find Illinois peers offering a skill, request help, and connect when they accept.

## What it does

Profiles combine offered skills, availability and evidence links. Members can discover peers, save profiles and exchange help requests. Shared contact details become available after acceptance. An Illinois-email account provides access; it does not imply university approval or verified enrollment.

## Architecture

```text
React browser → Django API + static frontend → PostgreSQL / pgvector
                              └── Redis + worker → email
```

React/TypeScript, Django REST Framework and PostgreSQL remain the core stack. Cloud hosting and paid AI are not enabled.

## Quick start

Install Docker with Compose, then:

```sh
git clone https://github.com/adhvikrayaprolu/uiuc-skillshare.git
cd uiuc-skillshare
cp .env.example .env
docker compose up --build --wait
```

Open **http://localhost:8080**. The local email inbox is **http://localhost:8025**. Startup applies migrations and initializes skill categories; it never creates demo members. First startup downloads images. Google requires your own client configuration; the identity milestone is tracked in [#10](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/10).

## Configuration and checks

`.env.example` contains local defaults and optional integration settings. Never commit a real `.env`. Paid semantic calls remain disabled. `make check` runs the PostgreSQL backend suite, frontend tests, lint, type checks and production build in containers.

`docker compose down` stops services and preserves data. To reset **only disposable local data**, use `docker compose down --volumes`.

## Project structure

- `frontend/src/`: pages, components, API clients and tests.
- `backend/`: accounts, profiles, taxonomy, discovery and interactions.
- `docs/`: product and engineering guidance.

## Current limits

The complete onboarding, feedback, notification, matching and deployment-readiness milestone is being implemented in issue-linked draft PRs. Hosted Supabase, live Google, real email delivery and paid semantic quality remain unverified. No university affiliation is claimed.

See the [readiness tracker](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/5) and [developer guide](docs/development.md) for details.
