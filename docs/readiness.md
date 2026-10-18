# Readiness evidence

Verified locally on 2026-10-02 in the final implementation branch. The ten draft PRs remain dependent and require human review; main is not this branch. See [tracker #5](https://github.com/adhvikrayaprolu/uiuc-skillshare/issues/5) for current GitHub CI and PR status.

| Status | Evidence / remaining gate |
|---|---|
| Local application readiness | `make check` passed: 94 PostgreSQL regressions, 29 frontend tests, lint, types/production build, generated API validation, migrations and offline production settings. Real Chromium two-member journey, keyboard/mobile overflow and automated WCAG checks passed. |
| Supabase preparation | Private-schema migrations, restricted runtime permissions, browser-role denial and backup/restore passed on local PostgreSQL. Private Storage adapter/failure/retry fixtures passed. Hosted connection/bucket/certificate behavior is unverified; no project was provisioned. |
| Live integration readiness | Local SMTP/Mailpit and actual code/session/logout journey passed. Google signature/claims and external failures use fixtures. Real Google/SMTP delivery, hosted Supabase and semantic quality require credentials/authorization; paid calls remain disabled and none were made. |

A separate disposable Compose project started on fresh volumes with **zero seeded accounts and 35 approved skills**. Its synthetic fixture persisted across app/database/Redis restart. With database or Redis stopped, liveness remained 200 and readiness returned 503. Only its disposable volumes were removed; the running application's data was preserved.

Keyword ranking: 30/30 covered tasks placed a suitable helper in the top three on 225 synthetic peers. The documented five-sample test used nine queries with median about 29 ms locally; this is a bounded fixture benchmark, not a campus-scale SLA or semantic-quality claim. Detailed matching and browser methodology are linked in [matching](matching.md) and [browser verification](browser-verification.md).

Python locked-dependency and frontend audits found no known vulnerabilities at verification time. A filename-only scan found no obvious credential patterns or tracked build/cache/database/environment artifacts; this is not proof that secrets have never existed in history. No credentials were revoked and history was not rewritten.

Remaining release gates: review/merge the stack, configure approved hosting and secrets, exercise HTTPS/Google/SMTP/Supabase/storage recovery on that host, decide operational retention/monitoring and validate real-user relevance. There is no deployment or production-data migration in this implementation. Infrastructure is awaiting review, not STABLE on main.
