# Readiness evidence

Verified locally on 2026-10-18 on `codex/42-launch-readiness`, the top of the stacked roadmap PRs ([#31](https://github.com/adhvikrayaprolu/uiuc-skillshare/pull/31) through the launch-readiness PR). None of it is merged; main is not this branch. See [tracker #5](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/5) for GitHub CI and PR status.

| Status | Evidence / remaining gate |
|---|---|
| Local application readiness | `make check` passed: 158 PostgreSQL regressions, 71 frontend tests, lint, types/production build, generated API validation, migrations and offline production settings. The real Chromium two-member journey (setup, discovery, swap request, completion, feedback, report, block, alerts by email, policy pages, titles, robots/sitemap, share image) passed with keyboard, mobile overflow and automated WCAG checks. |
| Launch basics | Per-screen titles, canonical/Open Graph/Twitter tags filled from `APP_PUBLIC_URL`, a 1200×630 share image, favicon, `robots.txt`, sitemap and `X-Robots-Tag: noindex` on signed-in screens. Crashes show a recovery screen instead of a blank page. |
| Error monitoring | First-party: the browser posts scrubbed, deduplicated reports to `/api/client-errors/` (throttled, no session), and staff read them in the Django admin. No third-party service is configured. Sentry or similar needs an account and approval. |
| Launch metrics | Staff see the product-plan success measures on `/analytics`, computed from existing records: setup completion, time to first match, sent a request within 7 days, acceptance, response time, completion and feedback. Values are `—` until there is data. No real-user numbers exist yet. |
| Supabase preparation | Private-schema migrations, restricted runtime permissions, browser-role denial and backup/restore passed on local PostgreSQL. Private Storage adapter/failure/retry fixtures passed. Hosted connection/bucket/certificate behavior is unverified; no project was provisioned. |
| Live integration readiness | Local SMTP/Mailpit and the code/session/logout journey passed, including branded HTML email. Google signature/claims and external failures use fixtures. Real Google/SMTP delivery, hosted Supabase and semantic quality require credentials and authorization. Paid calls remain disabled and none were made. |

## Blocked on credentials or approval

These steps can't be done or verified from this repository without decisions and access that only the owner can grant:

- Hosting, a domain and HTTPS: choose a host, set `APP_PUBLIC_URL`/`ALLOWED_HOSTS`, and deploy from the reviewed stack.
- A Google OAuth client for the production origin (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, built into the frontend too).
- An SMTP provider with a verified sender, plus SPF/DKIM so codes and alerts land in inboxes.
- A Supabase project (database role setup and private avatar bucket) following the [operations runbook](operations.md).
- A staging environment for a pilot cohort before public launch.
- Optional third-party error monitoring (for example Sentry) if the first-party reports aren't enough.
- A scheduled `dispatch_jobs --loop` process on the host for email retries, request expiry, skill alerts and the weekly digest.

## Earlier evidence

A separate disposable Compose project started on fresh volumes with **zero seeded accounts and 35 approved skills**. Its synthetic fixture persisted across app/database/Redis restart. With database or Redis stopped, liveness remained 200 and readiness returned 503. Only its disposable volumes were removed; the running application's data was preserved.

Keyword ranking: 30/30 covered tasks placed a suitable helper in the top three on 225 synthetic peers. The documented five-sample benchmark measured a median of about 29 ms locally. It is a bounded fixture benchmark, not a campus-scale SLA or semantic-quality claim. Detailed matching and browser methodology are linked in [matching](matching.md) and [browser verification](browser-verification.md).

Python locked-dependency and frontend audits found no known vulnerabilities at the time of that verification. A filename-only scan found no obvious credential patterns or tracked build/cache/database/environment artifacts; this is not proof that secrets have never existed in history. No credentials were revoked and history was not rewritten.

Remaining release gates: review and merge the stack, complete the blocked items above, exercise HTTPS/Google/SMTP/Supabase/storage recovery on that host, and validate real-user relevance with a pilot. There is no deployment or production-data migration in this implementation. Infrastructure is awaiting review, not STABLE on main.
