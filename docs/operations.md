# Supabase and operations readiness

This is preparation for a separately approved host. No project, bucket or deployment was created; hosted connectivity remains unverified. Local Compose is development-only and binds app/email ports to loopback.

## Database configuration

Django migrations own the schema. Use PostgreSQL 16 with pgvector. A persistent Django process should use a direct connection or the **session pooler on port 5432**; use the direct connection for migrations and backups. Do not use the transaction pooler on port 6543 for this setup. Supabase describes [direct versus pooler connections](https://supabase.com/docs/guides/database/connecting-to-postgres).

Use the project's connection details, URL-encode passwords and verify certificates (`DB_SSLMODE=verify-full`, `DB_SSLROOTCERT` pointing to the provider CA). Keep `DB_CONN_MAX_AGE=30`, two Gunicorn workers and conservative pool sizes initially; account for web, worker and dispatcher connections together. Configure Redis privately with authentication/TLS and SMTP with a verified sender. Never paste connection strings or credentials into issues/logs.

`.env.production.example` is a placeholder-only template, separate from local Compose. Application and worker use `skillshare_app`; the migration process uses `skillshare_migrate`. Never provide the migration/admin connection to browser or runtime services. Django requires an exact HTTPS origin, secure session/CSRF cookies, shared Redis and SMTP when `ENVIRONMENT=production`. Only trust forwarded headers behind a proxy that replaces client-supplied headers. Enable subdomain/preload HSTS only after assessing the whole domain.

## Future schema preparation (requires hosting approval)

On the intended project, an administrator creates dedicated LOGIN roles `skillshare_migrate` and `skillshare_app` without superuser, database-creation or role-creation permissions; set passwords interactively with `psql`'s `\password`. Keep the migration credentials in a separate protected secret.

Run `scripts/database/supabase-schema.sql` through the approved administrator connection. It initializes pgvector in `extensions`, creates private `skillshare` owned by the migration role, grants runtime DML/sequence usage, and restricts current/default table/sequence/function grants for browser roles. Set `DB_SCHEMA=skillshare` for every Django process. Run Django migrations as the migration role, seed **taxonomy only**, and verify with `python manage.py verify_runtime_role` using the restricted application connection.

Disable the unused Supabase Data API in project API settings and keep `skillshare` out of exposed schemas. Application tables must never be exposed directly to `anon`, `authenticated` or `service_role`. Existing and future table grants are restricted by the SQL script. This separation retains Django as the application authorization boundary. See [Supabase API security](https://supabase.com/docs/guides/api/securing-your-api).

## Private avatars

Prepare a **private** `avatars` bucket only after hosting approval. Configure `AVATAR_STORAGE=supabase`, the HTTPS project origin and a server-only storage key. New secret keys use the `apikey` header; legacy service-role JWTs also use Authorization. See [API key guidance](https://supabase.com/docs/guides/getting-started/api-keys) and [private buckets](https://supabase.com/docs/guides/storage/buckets/fundamentals).

Django checks bucket privacy on every operation, decodes/normalizes uploaded images to bounded JPEGs, and serves downloads through the authorized `/api/profiles/<id>/avatar/` route. It never returns provider URLs, signed URLs or keys. Timeouts/public buckets fail closed with a retryable error; failed uploads preserve the existing avatar. Immutable UUID names and a SQL deletion outbox allow retrying replaced/deleted avatars. The worker shares local avatar storage with the web app; hosted web/worker use the same private bucket. Admin can retry exhausted cleanup jobs. Test fixtures verify the adapter; real hosted Storage remains unexercised.

## Verified local migration and recovery rehearsal

```sh
python3 scripts/database/rehearse.py
```

With the local Compose app running, this command creates two temporary PostgreSQL databases, uses the same private-schema grants, migrates under the migration role, seeds taxonomy plus one private synthetic record, backs up the application schema and restores it. It verifies restored content, runtime least privileges and browser-role denial, then removes only its scratch databases/new scratch roles. The application database/volumes stay intact. A local-only host/database guard refuses other targets; no provider calls occur. `make check` includes this rehearsal.

## Backup / restore for a future hosted application

Create scheduled encrypted database **and private-avatar** backups, restrict access and retention, and verify recovery periodically. Use a protected PostgreSQL service file/pgpass (mode 0600), a certificate-verified direct migration connection and provider-approved backup permissions. A schema-only application dump does not include avatar bytes, Redis or provider-managed tables. Never import local demo accounts into a real member database.

Example backup after hosting is separately approved (the service alias contains credentials privately):

```sh
umask 077
PGSERVICE=skillshare_migrations pg_dump -Fc --schema=skillshare --no-owner --no-privileges --file=skillshare.dump
```

For recovery, prepare a separate empty target, apply the role/schema script, temporarily grant database CREATE to the migration role for schema restore, restore as that role, revoke the temporary grant and reapply schema grants. Use a dedicated restore service alias pointing at that target, never the live application database:

```sh
PGSERVICE=skillshare_restore pg_restore --role=skillshare_migrate --clean --if-exists --no-owner --no-privileges --exit-on-error skillshare.dump
```

The clean option drops the target application schema: require explicit target verification and maintenance approval. Restore the corresponding avatar backup, then run migrations/checks, restricted-role verification, content checks and a two-member smoke journey before switching traffic. Freeze writes for a coordinated final snapshot; keep the source intact until recovery is accepted. Migrate real data only with separate authorization. The local script tests this sequence; hosted backup retention, recovery timing and storage recovery remain unverified.

## Moderation runbook

Members report from a profile (Report member). Each report records a reason (`harassment`, `inappropriate_content`, `spam`, `fake_profile`, `misleading_credentials` or `other`) and a description of at least 10 characters. Reports are never shown to the reported member. Moderators are Django staff users. They work in `/admin/` → Interactions → Reports, filtering by status `open` and sorting by date. The report fields are read-only in the admin.

1. **Triage within two days.** Open the report, then follow the reported profile, user or review to its admin page. Use the Help requests admin to search by topic, seeker email or helper name for the related interactions, and filter by kind or status as needed.
2. **Decide and apply one action** from the Reports action menu. Each action writes a `ModerationAudit` row with the acting staff user:
   - *Mark selected reports reviewed (no action needed)*: the report was checked and nothing broke the guidelines. Status becomes `reviewed`.
   - *Dismiss selected reports*: the report is spam, a duplicate or made in bad faith. Status becomes `dismissed`.
   - *Suspend the reported members and close these reports*: for harassment, threats, impersonation, selling, academic dishonesty or repeated problems. It deactivates the account, revokes every session and removes the profile from search. Peers can no longer see the profile. It also cancels the member's pending and accepted requests with the reason "This member is no longer available.", and finished history is kept. Superusers are never suspended. Status becomes `action_taken`.
3. **Content-only problems** (an inappropriate headline, bio or review): edit or hide that record in the admin, then mark the report reviewed. Hide a profile by setting its visibility to private.
4. **Restore** a suspended account from Accounts → Users with *Restore selected accounts*, which is also audited and rebuilds their search entry. Cancelled requests stay cancelled.
5. **Emergencies.** If a report describes immediate danger, contact campus or local emergency services first. The product tells members to call 911. Do not message the reported member from personal accounts.

Policy pages are `/guidelines`, `/privacy` and `/terms`. Their text describes current product behaviour and needs human or legal review before real-user launch. If you change sharing, retention, analytics or AI behaviour, update `frontend/src/pages/legal/` and the "Last updated" date in the same change.

## Request expiry and reminders

A pending request gets `expires_at = created_at + 14 days`. If no one has replied after 7 days, the `dispatch_jobs` loop sends the receiver one reminder notification. At expiry, the loop marks the request `expired`, bumps its version so a racing accept gets a 409, and notifies both sides. Each pass processes up to 100 rows with `SELECT … FOR UPDATE SKIP LOCKED`, so multiple dispatchers are safe. Migration `0008_request_expiry` backfills existing pending rows with at least 7 more days. A sender can have at most 5 pending requests at once.

## Skill alerts, digest and email

`dispatch_jobs --loop` runs each job independently every 5 seconds: the email outbox, embeddings, avatar cleanup, request expiry, skill alerts and weekly digests. One failing job does not stop the others. Skill alerts lock up to 20 newly live profiles per pass with `SKIP LOCKED`, write one notification per recipient (unique on `skill-alert:<profile>`, capped at 200 recipients) and mark the profile announced. Migration `profiles.0006` marks all existing profiles as announced so a deploy doesn't send a burst of alerts. Digests claim `last_digest_at` before sending, so each member gets at most one per week even if SMTP fails. Members can turn alerts and digests off in Settings, and every email links there.

Email templates live in `backend/templates/email/` (branded HTML and plain text). The sign-in code email overrides allauth in `backend/templates/account/email/`. Keep the code on its own line in the text version, because the browser journey reads it from Mailpit. Real SMTP delivery, sender reputation (SPF/DKIM) and unsubscribe headers are not verified locally.

## Future release gates

Run `make check` and require green PR CI before human review/merge. Build the frontend with the same Google client ID as Django. Rehearse HTTPS proxy/TLS, configured Google audience/domain, actual SMTP delivery/retry, Supabase certificates/connections/grants, private bucket access, backup recovery and startup on the intended host. Validate process restart/persistence and resource budgets. Restrict Django admin to operators and use strong admin credentials; normal members use verified Google/email flows.

`/api/health/live/` reports process availability; `/api/health/ready/` requires both PostgreSQL and Redis. Monitor failed email/avatar/embedding jobs, delivery queues, database connections, readiness, request error rates and disk/bucket capacity. Keep diagnostic logs free of emails/contact bodies/tokens; retention and incident handling need operator decisions before real-user launch. Paid AI needs separate approval and live relevance evaluation; its default flag and daily allowance stay false/zero.
