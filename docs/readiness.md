# Readiness evidence

Verified locally on 2026-10-21 on `main` after the roadmap merges (#31 through #54), plus `codex/59-first-run-swaps`. A fresh clone ran the README quick start, and a new student signed up by email code, set up, matched, swapped with the demo student and left feedback. See [tracker #5](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/5) for PR status.

| Status | Evidence / remaining gate |
|---|---|
| Local application readiness | `make check` passed in its isolated Compose project: 172 PostgreSQL tests, 90 frontend tests, lint, strict types and the production build, OpenAPI validation, migrations, production settings (including refusing `DEMO_MODE`), runtime-role permissions and the backup/restore rehearsal. The Chromium two-member journey (setup, discovery, swap request, completion, feedback, report, block, email alerts, policy pages, titles, robots/sitemap, share image) passed with keyboard, mobile overflow and axe WCAG checks. |
| Demo network | `make dev` seeds the fictional demo network. `make smoke` passed 8 checks through the public origin, and `make a11y` found no axe violations, console errors or failed requests on any screen at 1440px and 390px. `npm audit` and `pip-audit` report 0 known vulnerabilities. |
| Launch basics | Per-screen titles, canonical/Open Graph/Twitter tags filled from `APP_PUBLIC_URL`, a 1200×630 share image, favicon, `robots.txt`, sitemap and `X-Robots-Tag: noindex` on signed-in screens. Crashes show a recovery screen instead of a blank page. |
| Error monitoring | First-party: the browser posts scrubbed, deduplicated reports to `/api/client-errors/` (throttled, no session), and staff read them in the Django admin. No third-party service is configured. Sentry or similar needs an account and approval. |
| Launch metrics | Staff see the product-plan success measures on `/analytics`, computed from existing records: setup completion, time to first match, sent a request within 7 days, acceptance, response time, completion and feedback. Values are `—` until there is data. No real-user numbers exist yet. |
| Supabase preparation | Private-schema migrations, restricted runtime permissions, browser-role denial and backup/restore passed on local PostgreSQL. Private Storage adapter/failure/retry fixtures passed. Hosted connection/bucket/certificate behavior is unverified; no project was provisioned. |
| Live integration readiness | Local SMTP/Mailpit and the code/session/logout journey passed, including branded HTML email. Google signature/claims and external failures use fixtures. Real Google/SMTP delivery, hosted Supabase and semantic quality require credentials and authorization. Paid calls remain disabled and none were made. |

## Blocked on credentials or approval

These steps can't be done or verified from this repository without decisions and access that only the owner can grant:

- Hosting, a domain and HTTPS: choose a host, set `APP_PUBLIC_URL`/`ALLOWED_HOSTS`, and deploy from the reviewed stack ([#47](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/47)).
- A Google OAuth client for the production origin (`GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET`, built into the frontend too) ([#48](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/48)).
- An SMTP provider with a verified sender, plus SPF/DKIM so codes and alerts land in inboxes ([#48](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/48)).
- A Supabase project (database role setup and private avatar bucket) following the [operations runbook](operations.md).
- A staging environment for a pilot cohort before public launch ([#49](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/49)).
- Optional third-party error monitoring (for example Sentry) if the first-party reports aren't enough.
- A scheduled `dispatch_jobs --loop` process on the host for email retries, request expiry, skill alerts and the weekly digest.

## Matching benchmark

Keyword ranking placed a suitable helper in the top three for 30 of 30 covered tasks across 225 synthetic peers, with a median of about 29 ms over five local runs. It's a bounded fixture benchmark, not a campus-scale SLA or a measure of semantic quality. See [matching](matching.md) and [browser verification](browser-verification.md).

Remaining release gates: review and merge the stack, complete the blocked items above, exercise HTTPS/Google/SMTP/Supabase/storage recovery on that host, and validate real-user relevance with a pilot. There is no deployment or production-data migration in this implementation. Infrastructure is awaiting review, not STABLE on main.
