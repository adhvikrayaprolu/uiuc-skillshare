# Frontend

React + Vite web app for Illini SkillSwap.

## Structure

```text
frontend/
├── src/
│   ├── app/          # App entry and route definitions
│   ├── components/   # Shared UI, layout controls, cards, modals
│   ├── data/         # Mock/demo data
│   ├── hooks/        # Auth, API queries, profile editor state
│   ├── layouts/      # Public and authenticated layouts
│   ├── lib/          # API clients, mappers, auth helpers
│   ├── pages/        # Main route screens
│   ├── styles/       # Global CSS and theme styles
│   └── types/        # Shared TypeScript API types
├── index.html
├── package.json
└── vite.config.ts
```

## Environment

Copy local env file:

```bash
cp frontend/.env.example frontend/.env
```

Main variables:

- `VITE_API_BASE_URL`: backend API base URL. Use `/api` in local dev so Vite proxies to Django on port 8000.
- `VITE_USE_MOCKS`: `false` uses Django API; `true` uses local mock data.
- `VITE_GOOGLE_CLIENT_ID`: Google OAuth client ID when real OAuth is wired.

Real `.env` files are local only and gitignored. Do not commit secrets.

## Run

```bash
npm --prefix frontend install
npm --prefix frontend run dev
```

Open `http://localhost:5173`.

Backend API should run at `http://127.0.0.1:8000/api` when `VITE_USE_MOCKS=false`.

## Validation

```bash
npm --prefix frontend run lint
npm --prefix frontend run build
```

## Main Routes

- `/`: landing page.
- `/login`: local demo login.
- `/dashboard`: authenticated home.
- `/discover`: profile search and discovery.
- `/profiles/:id`: full student profile.
- `/profile/edit`: edit own profile.
- `/saved`: saved profiles.
- `/requests`: help requests.
- `/connections`: accepted help requests.
- `/analytics`: activity and network analytics.
- `/settings`: settings.
