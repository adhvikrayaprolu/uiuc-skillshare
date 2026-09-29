# Illini SkillSwap
Find UIUC peers who can share practical skills, advice, and project experience.

## What it does
Illinois students build discoverable skill profiles, search and filter peers, save profiles, send help requests, and manage accepted connections. Reviews, endorsements, availability and contact preferences help students choose whom to approach. It supports informal peer learning; it is not a paid tutoring marketplace.

## Key features
- Illinois Google sign-in and profile onboarding
- Search by skills, major, year and availability
- Saved profiles, help requests, connections and profile feedback
- Profile visibility, blocking/reporting and personal analytics
- Local rule-based discovery matching; no hosted AI service required

## Architecture and tech stack
React 18/TypeScript, Vite, TanStack Query and Axios consume a Django REST API authenticated by JWT. Django apps separate accounts, profiles, interactions, taxonomy and discovery. SQLite is preferred locally; PostgreSQL is configured through DATABASE_URL. The Vite development proxy routes `/api` to Django.

## Quick start
Requires Python 3.13, Node 22.23+ and npm. Run from the repository root:

```sh
make setup
make dev
```
Open http://127.0.0.1:5173 and choose **Local API demo login**. Startup migrates and seeds the SQLite database. Configuration files are created only when missing. Ctrl-C stops both servers. Real account data persists; the separate mock demo uses simulated data and is labeled accordingly.

## Configuration
`backend/.env.example` and `frontend/.env.example` document local settings. Google sign-in requires matching backend/frontend client IDs. The development login endpoint is enabled only with DEBUG=True; public deployments must use DEBUG=False and a private SECRET_KEY of at least 32 characters. Startup rejects missing/insecure production keys and uses secure cookies outside development.

Set production hosts, HTTPS and allowed CORS origins explicitly. Never commit `.env`, provider secrets, media or database files. See [backend setup](backend/README.md) for API/admin configuration and [frontend setup](frontend/README.md) for UI configuration.

## Testing
```sh
make check
```
Runs Django system/migration checks and backend tests, then frontend regression tests, lint, TypeScript checks and production build. CI uses the same checks with dependency caching and read-only repository permissions. Frontend tests exercise demo/API session separation, logout cleanup and truthful notification/error/navigation behavior. Backend tests cover permissions, account/profile boundaries and interactions.

## Project structure / data model
`backend/accounts`, `profiles`, `interactions`, `taxonomy`, `discovery`, `common` own domain logic. `frontend/pages`, `hooks`, `lib` and `components` separate screens, query behavior, API mapping and shared UI. Profiles carry skill tags, availability and contact methods; help requests connect seekers to helpers and become accepted connections. API documentation is available through the backend schema endpoints described in its README.

## Screenshots / demo
The local API demo provides seeded students and skills. [Product overview](docs/product-overview.md) preserves the fuller concept, user journeys and existing implementation notes. Mock demo activity is explicitly labeled; real sessions never fall back to invented notifications.

## Design decisions and known limitations
The existing REST architecture and UI are preserved. Activity summaries derive from existing request/profile queries; they are not a durable notification inbox with read tracking. Large screens remain candidates for incremental decomposition. Profile editing validates all details before saving them in one database transaction; failed saves preserve prior data. Credential-backed Google sign-in and production deployment require human configuration and verification. No performance improvement is claimed without measurement.

## Future work
Prioritize credential-backed sign-in verification and focused accessibility checks before unrelated features or infrastructure. GitHub issues track milestones when issue write access is available.
