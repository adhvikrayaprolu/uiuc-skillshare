# Browser verification

`make check` runs Chromium in a version-matched Playwright container against the local app, PostgreSQL, Redis and Mailpit. It creates explicitly synthetic accounts and pagination fixtures, and removes them after the run. The browser suite rejects hosted URLs; it never calls Google, hosted storage or paid AI.

The two-member journey covers email-code sign-in, useful onboarding, learning goals, taxonomy search, discovery pagination, saving profiles, pending requests, helper acceptance, consented contacts, completion, request-bound reviews/endorsements, privacy withdrawal, reporting, blocking/unblocking, persistent notification read state, logout and confirmed account deletion.

Automated axe checks apply WCAG 2 A/AA and 2.1 A/AA rules to the landing/login pages, onboarding, dashboard, discovery, filters, profiles, request modal, requests, connections, review form, saved profiles, editor, settings and personal analytics. Keyboard assertions check modal focus trapping, Escape dismissal and focus restoration. The suite checks horizontal overflow at desktop and 390px mobile widths. This is regression evidence, not a claim of full WCAG conformance or validation on every browser or assistive technology.

`frontend/test-results/` holds the journey's step screenshots and failure traces, and `frontend/playwright-report/` holds the HTML report. Both are ignored by git.

With `make dev` running, `make a11y` repeats the axe, overflow and console checks on every screen of the demo network at 1440px and 390px, signed out, as the demo student and as the demo moderator. `make screenshots` regenerates the README screenshots in `docs/screenshots/` and the video in `docs/demo/` from the demo account; every person shown is fictional.

For native frontend iteration against the running Compose API:

```sh
cd frontend
DEV_API_URL=http://127.0.0.1:8080 npm run dev
```

Use `npm run test:e2e` with `E2E_APP_URL=http://127.0.0.1:5173` and an installed version-matched Chromium. Repeated email-code test runs are subject to the real three-requests-per-minute IP limit. The container runner uses a separate local hostname because Chromium upgrades `http://app` to HTTPS under its `.app` HSTS rules. Request keys also support browser contexts without `crypto.randomUUID` using cryptographic UUIDv4 generation.
