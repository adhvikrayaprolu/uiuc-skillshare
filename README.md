# Illini SkillSwap
A UIUC-focused peer network for finding classmates who can share practical skills, advice and project help.

## Overview
Students build skill profiles, discover relevant peers, save profiles and exchange help requests. The goal is to make informal campus knowledge easier to find, beyond existing friend groups and chats.

## Project Context
A UIUC-focused portfolio project. The current local experience is a seeded Django/React application; production Illinois-account verification is not claimed as deployed or verified.

## Key Features
- Search/filter discovery and rich student profiles.
- Saved profiles and request/connection interaction states.
- Atomic onboarding/profile collection saves: failed edits preserve existing data.
- API-derived notification summaries with honest empty/error states and explicitly labeled demo samples.

## Architecture / Tech Stack
React/TypeScript + Vite/Tailwind → Django REST Framework → SQLite locally. Django apps separate accounts, profiles, discovery, interactions and taxonomy. JWT authenticates APIs; Google sign-in is an optional configuration-dependent path.

## Quick Start
Python3.13, Node22.23+ and npm:
```sh
make setup
make dev
```
Open http://127.0.0.1:5173. Setup installs dependencies and copies missing environment templates without overwriting local configuration. Startup migrates/seeds the backend at8000 and launches the frontend. Use local developer login with a disposable Illinois-format email; this is local/demo behavior, not proof of university identity. Ctrl-C stops both servers.

## Validation / Tests
```sh
make check
```
Django checks, migration consistency and backend regressions; frontend tests, lint, TypeScript and production build. Tests cover authentication/permissions, requests, demo isolation and aggregate profile validation/rollback.

## Environment Variables
See `backend/.env.example` and `frontend/.env.example`. Local DEBUG enables developer login; deployment must disable it and supply a private strong `SECRET_KEY`, reviewed hosts/CORS and HTTPS settings. Google credentials are optional for the verified local flow. Never commit `.env` or use a development key in production.

## Project Structure
`frontend/src/`: pages, shared components, hooks and API clients; `backend/`: Django domain apps; `scripts/`: setup/dev/check entry points; `docs/`: product notes and engineering workflow.

## Current Status / Limitations
Credential-backed Google authentication and production deployment remain unverified. Notifications summarize current API activity; durable read/unread history is not a completed feature. Targeted accessibility review remains useful; no framework rewrite or speculative optimization is required.

Read [AGENTS.md](AGENTS.md), the active PRs and the GitHub readiness tracker before choosing work. [Product notes](docs/product-overview.md) provide deeper context and may describe future goals.
