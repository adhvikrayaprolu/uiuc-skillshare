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

## Future release gates

Run `make check` and require green PR CI before human review/merge. Build the frontend with the same Google client ID as Django. Rehearse HTTPS proxy/TLS, configured Google audience/domain, actual SMTP delivery/retry, Supabase certificates/connections/grants, private bucket access, backup recovery and startup on the intended host. Validate process restart/persistence and resource budgets. Restrict Django admin to operators and use strong admin credentials; normal members use verified Google/email flows.

`/api/health/live/` reports process availability; `/api/health/ready/` requires both PostgreSQL and Redis. Monitor failed email/avatar/embedding jobs, delivery queues, database connections, readiness, request error rates and disk/bucket capacity. Keep diagnostic logs free of emails/contact bodies/tokens; retention and incident handling need operator decisions before real-user launch. Paid AI needs separate approval and live relevance evaluation; its default flag and daily allowance stay false/zero.
