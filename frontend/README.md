# Frontend

React 19 + TypeScript (strict) + Vite 8 single-page app for Illini SkillShare. It always talks to the real API, and in local development the API's seeded demo network supplies the data.

```text
src/
  app/          routes
  layouts/      public, setup and app shells
  pages/        one component per screen, with tests alongside
  components/   shared UI, cards, dialogs, layout controls
  hooks/        TanStack Query hooks and auth state
  lib/          API clients, mappers and helpers
  types/        API and view-model types
e2e/            two-member Playwright journey (run by make check)
e2e-tour/       demo-account screenshot tour and accessibility sweep
```

## Run

The Docker quick start in the [root README](../README.md#quick-start) serves the built app at http://localhost:8080. For hot reload against that running API:

```bash
DEV_API_URL=http://127.0.0.1:8080 npm run dev
```

Vite proxies `/api` to Django, so cookies and CSRF work on any localhost name and no `.env` file is needed. Set `VITE_GOOGLE_CLIENT_ID` only to show Google sign-in.

## Check

```bash
npx tsc -b && npm run lint && npm test && npm run build
```

Browser checks run in a version-matched Playwright container from the repo root: `make browser-check`, `make a11y` and `make screenshots`.
