# Illini SkillShare

[![CI](https://github.com/adhvikrayaprolu/uiuc-skillshare/actions/workflows/ci.yml/badge.svg)](https://github.com/adhvikrayaprolu/uiuc-skillshare/actions/workflows/ci.yml)
![Python 3.13](https://img.shields.io/badge/Python-3.13-3776AB?logo=python&logoColor=white)
![Django 6.1](https://img.shields.io/badge/Django-6.1-092E20?logo=django&logoColor=white)
![React 19](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![PostgreSQL 16](https://img.shields.io/badge/PostgreSQL-16%20%2B%20pgvector-4169E1?logo=postgresql&logoColor=white)
![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)

**Trade what you know for what you want to learn.** Illini SkillShare matches University of Illinois students who can teach each other: you teach Python, they teach you Figma. When nobody is a two-way match, you can still ask someone for help. Contact details are shared only after a request is accepted, and both people leave feedback when it's done.

▶ **[Watch the demo video](docs/demo/tour.webm)** (30 seconds), or run it yourself with the two-command [setup](#getting-started) and click **Try the demo**.

![Home for a student: requests that need attention, two-way swap matches and a setup checklist](docs/screenshots/home-desktop.png)

**Contents:** [How it works](#how-it-works) · [The rest of the app](#the-rest-of-the-app) · [Highlights](#highlights) · [Getting started](#getting-started) · [Optional integrations](#optional-integrations) · [Architecture](#architecture) · [Testing and CI](#testing-and-ci) · [API overview](#api-overview) · [Project structure](#project-structure)

## How it works

Follow Jamie, a design student who wants to learn Python, from first visit to a finished swap with Alex, a CS student who wants to learn Figma. These screenshots come from an automated tour of the real app.

### 1. Land and sign in with an Illinois email

The landing page explains swaps, lists the skills people share and shows how privacy works. **Get started** asks for an `@illinois.edu` address and emails a one-time code. Running locally, codes go to a test inbox (the highlighted note links to it), and **Try the demo** skips sign-up entirely.

| ![Landing page](docs/screenshots/landing-desktop.png) | ![Sign in with an email code](docs/screenshots/signin-code-desktop.png) |
|---|---|

### 2. Set up a profile in four short steps

New members get a focused, full-screen setup with no app navigation to wander into: about you, what you can teach, what you want to learn, and availability and contact. Each step checks its own fields, and a refresh doesn't lose the draft. Learning goals are shown on the profile by default, so other people can propose swaps.

![Setup step 2: picking skills to teach](docs/screenshots/setup-teach-desktop.png)

### 3. See who you could swap with right away

As soon as the profile goes live, Jamie sees two-way matches first. Alex teaches Python and wants to learn Figma, and they're both free at the same two times. Below that are other people who teach what Jamie wants to learn. A brand-new network with nobody to match shows invite and "be the first to teach" prompts instead.

![First matches: a two-way swap with Alex, then more helpers](docs/screenshots/first-matches-desktop.png)

### 4. Propose a swap

From Alex's profile, **Propose a swap** pre-fills the trade: Jamie learns Python and teaches Figma. Contact details stay hidden until Alex accepts. **Just ask for help** sends a one-way request instead.

![Proposing a swap with a message](docs/screenshots/swap-proposal-desktop.png)

### 5. Accept, meet, complete

Alex gets a notification and sees the proposal under **Needs your attention**. Accepting reveals the contact details each person chose to share, and they meet off the platform. Unanswered requests expire after 14 days, with a reminder on day 7.

| ![Incoming swap proposal](docs/screenshots/request-incoming-desktop.png) | ![Accepted swap with shared contacts](docs/screenshots/request-accepted-desktop.png) |
|---|---|

### 6. Leave feedback both ways

After either person marks the swap complete, **both** of them can rate the other and endorse the skill they learned. Reviews appear on profiles; they confirm an interaction happened, not verified expertise.

![Feedback form after a completed swap](docs/screenshots/feedback-desktop.png)

## The rest of the app

| Discover: swap matches | Discover: all helpers |
|---|---|
| ![Swap matches](docs/screenshots/swaps-desktop.png) | ![Discover search](docs/screenshots/discover-desktop.png) |
| Every two-way match, each with its reason. | Keyword and taxonomy search with filters and explainable ranking. |

| Profiles | Requests |
|---|---|
| ![Member profile](docs/screenshots/profile-desktop.png) | ![Requests inbox](docs/screenshots/requests-desktop.png) |
| Why you matched, plus skills, goals, availability, reviews and endorsements. | Needs action, Active and Past, with the next step on every row. |

| Notifications | Launch metrics (staff) |
|---|---|
| ![Notifications](docs/screenshots/notifications-desktop.png) | ![Launch metrics](docs/screenshots/launch-metrics-desktop.png) |
| Who sent each update, what it's about, and when. | Setup completion, time to first match, acceptance, completion and feedback rates from real records. |

**On a phone**, the same four-item navigation sits at the bottom of the screen:

<p align="center">
  <img src="docs/screenshots/home-mobile.png" alt="Home on a phone" width="240">
  &nbsp;
  <img src="docs/screenshots/swaps-mobile.png" alt="Swap matches on a phone" width="240">
  &nbsp;
  <img src="docs/screenshots/requests-mobile.png" alt="Requests on a phone" width="240">
</p>

Everyone in the screenshots and the video is fictional: they come from the seeded demo network. `make screenshots` regenerates all of them with a headless browser.

## Highlights

- **Two-way swap matching.** It finds members who teach one of your learning goals *and* want to learn something you teach, and explains every match ("They teach you Figma ⇄ You teach them Python").
- **Consent before contact.** Django enforces it: contact details appear only to the other person in an accepted request. Private profiles, blocking and reporting apply everywhere, including search, notifications and email.
- **A complete request lifecycle.** Pending, accepted, completed, with version checks, idempotency keys, a cap of five waiting requests, 14-day expiry with a reminder on day 7, and two-way reviews and endorsements on swaps.
- **Retention without dark patterns.** Cold-start hints, an invite link, skill alerts when someone new teaches your goals, and an opt-in weekly digest sent through a retrying email outbox.
- **Trust and safety.** Reason-coded reports go to a staff moderation queue with an audit trail. Policy pages, account export and confirmed deletion are built in.
- **Launch basics.** Per-screen titles, Open Graph cards, a sitemap, `noindex` on signed-in screens, a crash-recovery screen, scrubbed first-party error reports and staff launch metrics.
- **Tested like a product.**
  - 264 automated tests: 172 backend tests on PostgreSQL and 92 frontend tests.
  - A two-member Chromium journey, plus an axe accessibility sweep of every screen at desktop and phone widths.
  - A smoke test of the quick start on a clean machine and a backup and restore rehearsal, all in CI on every pull request.

## Getting started

Requirements: **Docker** with Compose v2 (give Docker about 4 GB of memory), **Make** and **Python 3**. No accounts or API keys are needed.

```bash
git clone https://github.com/adhvikrayaprolu/uiuc-skillshare.git
cd uiuc-skillshare
make setup   # checks Docker, creates .env once (never overwritten), builds the images
make dev     # starts every service, seeds the demo network, waits until healthy
```

Then open **http://localhost:8080** and click **Try the demo**. You're signed in as Alex, a sample student who already has swaps, requests and feedback. On the sign-in page, **Or view the demo moderator screens** opens the staff launch metrics.

- `make dev` runs PostgreSQL, Redis, a local mail inbox, the app, the worker and the job dispatcher. It migrates the database and seeds the skill taxonomy and the fictional demo network.
- You can also sign up with any `@illinois.edu` address. The code arrives in the local test inbox at **http://localhost:8025**, and the sign-in page links to it.
- `make stop` stops everything and keeps your data, `make reset-demo` rebuilds the demo network, and `make logs` follows the app and workers.
- Without Make, `docker compose up --build --wait` works with no configuration at all.

<details>
<summary><strong>Native setup for frontend or backend editing</strong></summary>

Requires Python 3.13 and Node 22 (pinned in `.python-version` and `.nvmrc`). The native backend uses SQLite, so use `make check` for the full PostgreSQL baseline.

```bash
make native-setup   # backend virtualenv, frontend packages, backend/.env if missing
make native-dev     # Django on 127.0.0.1:8000 and Vite on 127.0.0.1:5173; Ctrl+C stops both
```

To run only the frontend against the Docker API with hot reload:

```bash
cd frontend && DEV_API_URL=http://127.0.0.1:8080 npm run dev
```

Vite proxies `/api` to Django, so sessions and CSRF work without a frontend `.env`. See [development](docs/development.md) for details.

</details>

## Optional integrations

Everything runs locally with no accounts or keys. Each integration below is optional, and the UI shows only the ones that are configured.

| Integration | Variables | When it's not configured |
|---|---|---|
| Google sign-in | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` (the same client ID is built into the frontend) | The Google button is hidden, and email codes work. |
| Email delivery | `EMAIL_HOST`, `EMAIL_PORT`, `EMAIL_USE_TLS`, `EMAIL_HOST_USER`, `EMAIL_HOST_PASSWORD`, `DEFAULT_FROM_EMAIL` | Local Compose delivers to the Mailpit inbox. Production refuses to start without SMTP. |
| AI-assisted matching | `AI_PAID_CALLS_ENABLED`, `AI_DAILY_CALL_LIMIT`, `OPENAI_API_KEY` | Off by default with a $0 allowance. Search uses keyword and taxonomy ranking, which needs no outside service. |
| Private avatar storage | `AVATAR_STORAGE=supabase`, `SUPABASE_URL`, `SUPABASE_AVATAR_BUCKET`, `SUPABASE_STORAGE_KEY` | Avatars are stored on a local volume. |
| Error reports | `CLIENT_ERROR_REPORTING`, `VITE_RELEASE` | On by default. Scrubbed browser errors go to the app's own database, where staff read them in Django admin. |

Core settings are `ENVIRONMENT`, `SECRET_KEY`, `DEBUG`, `ALLOWED_HOSTS`, `APP_PUBLIC_URL`, `DATABASE_URL`, `DB_SCHEMA`, `DB_SSLMODE`, `DB_SSLROOTCERT`, `REDIS_URL` and `DEMO_MODE` (local only). Production settings refuse development secrets, unencrypted database connections, missing Redis or SMTP, wildcard hosts and `DEMO_MODE`. The full production template is [`.env.production.example`](.env.production.example), and the hosting steps are in [operations](docs/operations.md).

## Architecture

```mermaid
flowchart LR
  B[Browser<br/>React + TypeScript] -->|same-origin cookies + CSRF| D[Django REST API<br/>also serves the built app]
  D --> P[(PostgreSQL 16<br/>+ pgvector)]
  D --> R[(Redis<br/>throttles + job queue)]
  X[Dispatcher] -->|leases due jobs| R
  X --> P
  R --> W[RQ worker]
  W --> M[SMTP or Mailpit]
  W --> S[Avatar storage<br/>local or Supabase]
```

### Key design decisions

| Design decision | Why |
|---|---|
| **Django is the authority** for membership, privacy, blocking, contact consent, request transitions and feedback eligibility | The React app only reflects the rules, so a modified client can't skip one |
| **Same-origin sessions with CSRF** (allauth), not tokens in the browser | Nothing sensitive in `localStorage`; Vite proxies `/api` in development so cookies behave the same |
| **Transactional outbox** for notifications and email, leased to RQ with retries and backoff | A Redis or SMTP outage delays email without losing it, and no duplicate notifications |
| **Explainable, bounded matching:** keyword and taxonomy ranking, capped at 200 candidates | Every result says why it matched; paid embeddings stay behind consent, a kill switch and a $0 default allowance ([matching design](docs/matching.md)) |
| **Least-privilege database roles:** the app's runtime role can't change the schema | Only the one-shot migration service uses the owner role, and a disposable rehearsal proves backup and restore |
| **Demo data that can't reach production:** `DEMO_MODE` is refused outside `ENVIRONMENT=local` | The one-click demo and seeded network exist only locally, and the production check verifies it |
| **Screens load on demand** (React Router lazy routes) | A first visit downloads only the screen it shows: a 352 kB entry script instead of one 639 kB bundle |

### Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 19, TypeScript 6 (strict), Vite 8, Tailwind CSS 4, React Router 7, TanStack Query 5, Vitest 5, Testing Library |
| Backend | Python 3.13, Django 6.1, Django REST Framework, drf-spectacular (OpenAPI), django-allauth, django-rq, Gunicorn 26, WhiteNoise |
| Data | PostgreSQL 16 with pgvector, Redis 7 |
| Testing | Django tests on PostgreSQL, Playwright with axe-core, a standard-library smoke test |
| Delivery | Docker Compose, GitHub Actions, Dependabot |

## Testing and CI

```bash
make check
```

`make check` runs everything in its own Compose project with demo data off, then removes that project, so it never touches your dev database. It covers:

- Django system checks, OpenAPI schema validation and a migration drift check
- PostgreSQL regression tests for authorization, privacy, concurrency, rollbacks, provider failures, rate limits, request expiry, alerts and metrics
- Frontend unit tests, lint, a strict type check and the production build
- A two-member Chromium journey (email-code sign-in, setup, swap, accept, complete, feedback, report, block, email alerts, account deletion) with axe WCAG checks and mobile overflow checks
- Production-settings and database-permission checks, and a backup and restore rehearsal

With `make dev` running, two more checks use the demo network:

- `make smoke` runs [`scripts/smoke.py`](scripts/smoke.py) through the app's public origin. It checks health, pages and share tags, signed-out refusal, CSRF, demo sign-in, Home, swaps, search, the inbox, a request, save and unsave, and sign-out.
- `make a11y` runs axe on every screen at desktop and phone widths as a visitor, the demo student and the demo moderator, and fails on any console error or failed request.

[CI](.github/workflows/ci.yml) runs on every pull request and on `main`:

| Job | What it proves |
|---|---|
| Backend, browser journey and recovery | The `make check` stages above, on PostgreSQL |
| Frontend | `tsc -b`, ESLint, Vitest and the Vite build on the pinned Node version |
| README quick start, smoke test and accessibility sweep | `make setup` and `make dev` work on a clean runner, setup leaves `.env` alone, then `make smoke` and `make a11y` pass |
| Dependency audit (non-blocking) | `pip-audit` and `npm audit` |

Runtime versions are pinned in [`.nvmrc`](.nvmrc) and [`.python-version`](.python-version). Dependabot groups patch and minor updates separately from major ones. The [release workflow](.github/workflows/release.yml) is manual, and until hosting exists it only builds and checks the production image.

## API overview

Interactive docs are at **http://localhost:8080/api/docs/** (OpenAPI at `/api/schema/`). The [frontend API contract](backend/docs/frontend_api_contract.md) describes each endpoint's behavior.

| Area | Endpoints |
|---|---|
| Auth | `GET /api/auth/csrf/`, `POST /api/auth/email/request/`, `POST /api/auth/email/confirm/`, `POST /api/auth/google/`, `GET/PATCH /api/auth/me/`, `POST /api/auth/logout/`, `GET /api/auth/export/`, `POST /api/auth/delete/`, `POST /api/auth/demo/` (local only) |
| Profiles | `GET/PATCH /api/profiles/me/`, `GET /api/profiles/{id}/`, plus skills, availability, contact methods, links and avatar |
| Discovery | `GET /api/discovery/search/`, `/swaps/`, `/recommended/`, `/community/` |
| Requests | `GET/POST /api/help-requests/?bucket=needs_action\|active\|past`, `GET/PATCH /api/help-requests/{id}/`, reviews, endorsements |
| Safety | `POST /api/reports/`, `GET/POST/DELETE /api/blocked-users/` |
| App | `GET /api/dashboard/`, `/api/notifications/`, `/api/health/live/`, `/api/health/ready/`, `POST /api/client-errors/` |

## Project structure

```text
uiuc-skillshare/
├── frontend/                React + TypeScript SPA (served by Django in production)
│   ├── src/pages/           one component per screen, with tests alongside
│   ├── src/components/      shared UI, cards, dialogs, layout and navigation
│   ├── src/hooks/ · src/lib/  TanStack Query hooks, API clients (cookies + CSRF), mappers
│   ├── e2e/                 two-member Playwright journey with accessibility checks
│   └── e2e-tour/            demo screenshot tour, demo video and accessibility sweep
├── backend/                 Django REST API
│   ├── accounts/            sessions, email codes, Google, export and deletion, demo network
│   ├── profiles/ · taxonomy/  profiles, skills, goals, availability, contacts, skill catalog
│   ├── discovery/           search, swap matches, recommendations, optional embeddings
│   ├── interactions/        requests and swaps, expiry, reviews, endorsements, blocks, reports
│   ├── common/              notifications, email outbox, Home, health, metrics, SEO, error reports
│   └── skillswap_backend/   settings with production safety checks
├── scripts/                 setup, smoke test, native dev helpers, database roles, recovery rehearsal
├── docs/                    matching, operations, readiness, development, screenshots, demo video
└── .github/                 CI, manual release workflow, Dependabot, issue and PR templates
```

More: [development](docs/development.md) · [operations and hosting](docs/operations.md) · [launch readiness](docs/readiness.md) · [product direction](CONTEXT.md) · [backend](backend/README.md) · [frontend](frontend/README.md).

An Illinois email gives access; it doesn't mean university approval or verified enrollment. This is a student project, not affiliated with or endorsed by the University of Illinois.
