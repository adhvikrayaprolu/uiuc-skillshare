# Illini SkillSwap

Illini SkillSwap is a UIUC-only skill-sharing and peer networking platform. It helps Illinois students find classmates who can share practical knowledge: technical tools, resume feedback, interview prep, research advice, startup experience, RSO guidance, design software, project collaboration, housing advice, course planning, and other informal support.

The project exists because much of the student knowledge network on campus is hidden inside friend groups, GroupMe chats, Discord servers, Reddit threads, Instagram stories, RSOs, and word of mouth. A student may be surrounded by people who can help them, but not know who they are or how to reach them. Illini SkillSwap makes that knowledge visible, searchable, and easier to access.

This platform does not replace course staff, office hours, or formal tutoring. Its focus is informal peer learning, mentorship, networking, career guidance, project help, and skill exchange across the UIUC community.

## Core Idea

Students sign in with an Illinois account, create skill-based profiles, list what they are open to helping with, and become discoverable by other verified UIUC students. Other students can search by skill, experience, topic, major, year, availability, contact method, or optional course tag.

Example tags:

- Python
- React
- SQL
- Excel
- GitHub
- Figma
- Resume review
- LinkedIn feedback
- Interview prep
- Consulting prep
- Startup experience
- Research
- Photography
- Public speaking
- RSO leadership
- Study abroad
- Housing advice
- Course planning

## Target Users

Illini SkillSwap serves two main groups:

- Students seeking help, advice, collaborators, or networking beyond their immediate circle.
- Students willing to share skills, experiences, or campus knowledge with others.

It is especially useful for first-year students, transfer students, international students, students exploring career paths, students building projects, and students trying to expand their network.

## Features

- UIUC-only authentication layer.
- Student profile creation and editing.
- Skills, tools, courses, interests, and experience tags.
- Search and filters by tag, major, year, availability, and contact method.
- Public profile pages with bio, expertise, availability, credentials, and contact options.
- Direct contact model through Illinois email, LinkedIn, Instagram, or another preferred method.
- Saved profiles, help requests, reviews, endorsements, analytics, and profile completeness indicators.
- AI-assisted discovery through a local rule-based semantic matcher.

Deprioritized features: paid tutoring, payments, real-time chat, video calls, automatic calendar booking, and formal course-specific tutoring workflows.

## Main Screens

- Landing page: introduces Illini SkillSwap and shows example skill tags.
- Onboarding/profile creation: collects major, year, bio, interests, contact preferences, availability, skills, and experience tags.
- Discovery/search: lets students search and filter profiles.
- Profile page: shows full bio, tags, availability, credentials, and contact info.
- Dashboard: lets a student manage their profile, saved profiles, requests, availability, and open-to-connect status.

## User Flow

1. Student signs in with an Illinois Google account.
2. Student creates a profile or searches for people.
3. Profile creator adds skills, experiences, availability, and contact preferences.
4. Profile becomes searchable by tags and filters.
5. Searcher enters a skill, topic, experience, or course.
6. System returns relevant student profiles.
7. Searcher opens a profile and reviews background, tags, and availability.
8. Searcher contacts the person through listed contact method.
9. Student may save the profile or leave feedback after connecting.

## Repository Structure

```text
.
├── .github/   # CI for frontend and backend
├── backend/    # Django REST API
├── frontend/   # React + Vite web app
└── README.md   # Project overview and setup
```

More detail:

- [backend/README.md](backend/README.md): API structure, env vars, auth notes, Django commands.
- [frontend/README.md](frontend/README.md): UI structure, env vars, routes, Vite commands.

## Tech Stack

- Frontend: React 18, TypeScript, Vite, React Router, TanStack Query, Axios, Tailwind CSS, lucide-react.
- Backend: Django 5, Django REST Framework, Simple JWT, django-filter, django-cors-headers, drf-spectacular.
- Local database: SQLite.
- Deploy database: PostgreSQL via `DATABASE_URL`.

## Setup

Prerequisites:

- Node.js 18+
- npm
- Python 3.11+

Install frontend:

```bash
npm --prefix frontend install
```

Install backend:

```bash
python3 -m venv backend/.venv
backend/.venv/bin/pip install -r backend/requirements.txt
```

Create backend environment file:

```bash
cp backend/.env.example backend/.env
```

Create frontend environment file:

```bash
cp frontend/.env.example frontend/.env
```

For real API mode, set this in `frontend/.env`:

```env
VITE_API_BASE_URL=/api
VITE_USE_MOCKS=false
VITE_GOOGLE_CLIENT_ID=
```

Real `.env` files are not committed. They stay local because they may contain secrets. The repo commits only `.env.example` files so another developer knows what variables to create.

Committed env templates:

- `backend/.env.example`
- `frontend/.env.example`

Local-only env files:

- `backend/.env`
- `frontend/.env`

## Run Locally

Start backend:

```bash
cd backend
.venv/bin/python manage.py migrate
.venv/bin/python manage.py seed_demo_data
.venv/bin/python manage.py runserver 127.0.0.1:8000
```

Start frontend in another terminal:

```bash
npm --prefix frontend run dev
```

Open:

- Frontend: `http://127.0.0.1:5173` (or `http://localhost:5173`)
- Backend API: `http://127.0.0.1:8000/api/`
- API docs: `http://127.0.0.1:8000/api/docs/`
- Django admin: `http://127.0.0.1:8000/admin/`

## Local Demo Login

With `DEBUG=True`, use the frontend login page option `Continue as Local API Demo User`. The backend `POST /api/auth/dev-login/` endpoint accepts `@illinois.edu` emails and returns JWT access/refresh tokens.

Do not use dev-login in production. Replace it with Illinois Google OAuth/SSO before real deployment.

## Useful Commands

```bash
npm run frontend:install
npm run frontend:dev
npm run frontend:build
npm run frontend:lint
npm run backend:venv
npm run backend:install
npm run backend:migrate
npm run backend:seed
npm run backend:check
npm run backend:test
npm run backend:dev
```

## Validation

Frontend:

```bash
npm --prefix frontend run build
npm --prefix frontend run lint
```

Backend:

```bash
cd backend
.venv/bin/python manage.py makemigrations --check
.venv/bin/python manage.py migrate
.venv/bin/python manage.py check
.venv/bin/python manage.py test
```

## GitHub

This is now a single monorepo:

`https://github.com/adhvikrayaprolu/uiuc-skillshare`
