# Development

The root Docker workflow is the recommended path. `make check` validates the same application/dependencies against PostgreSQL. Migrations run in a one-shot service before app/worker startup. `/api/health/live/` checks the process; `/api/health/ready/` checks the database.

For native editing: Python 3.13 and Node 22.23.1, then `make setup` and `make native-dev`. Validate with `make native-check`. Vite proxies `/api` to Django. The native fallback uses SQLite, so use Docker for PostgreSQL, concurrency and vector verification. Update dependencies through `requirements.in`, regenerate the hash lock with pip-tools 7.6.1, then rebuild; frontend installs use `npm ci`.

No demo users are seeded during normal startup. The legacy synthetic seed requires an explicit local environment and `ENABLE_DEMO=true`; use only a disposable database. Production never accepts that command. Never import demo users into a real member database.

Images exclude real environment files, databases, uploads, caches and generated build output. Application containers run as UID 10001. Named volumes preserve PostgreSQL, Redis and avatars. Local ports bind to loopback only.

Authentication uses allauth headless browser sessions and CSRF. Email codes expire in five minutes with three attempts; request/resend limits use Redis. JWT and developer-login endpoints are absent. Google ownership requires the configured audience, verified email and exact Illinois hosted domain; otherwise use an email code. Automatic email-based account linking is disabled.

Notifications and read state are persistent. Optional update emails default off in Settings. Request/feedback transactions create an email outbox record; the dispatcher leases due records to RQ and recovers queue/worker outages. Delivery retries six times with exponential backoff and a ten-second SMTP timeout. Django admin shows failures and can retry exhausted jobs. Email delivery is at least once if a process dies after SMTP accepts a message; request actions and notification events remain deduplicated. Withdrawing email consent or blocking prevents pending delivery. `python manage.py dispatch_jobs` performs one dispatcher pass for troubleshooting.
