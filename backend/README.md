# Backend

Django REST API for Illini SkillShare. In production it also serves the built React app.

| App | Responsibility |
|---|---|
| `accounts` | allauth sessions and CSRF, Illinois email codes, Google sign-in, export and deletion, the local demo network (`demo.py`) |
| `profiles` | Profiles, skills, learning goals, availability, contact methods, links, avatars and the visibility policy |
| `taxonomy` | The approved skill catalog (`catalog.py`) and its aliases |
| `discovery` | Keyword and taxonomy search, swap matches, recommendations and the optional embedding pipeline |
| `interactions` | Requests and swaps, transitions, expiry, reviews, endorsements, saving, blocking and reports |
| `common` | Notifications, the email outbox, Home, health checks, launch metrics, SEO routes and client error reports |

Run it with the root [quick start](../README.md#quick-start) (`make setup`, then `make dev`). Run the PostgreSQL suite with `make check` at the root.

Useful commands inside the app container (`docker compose exec app ...`):

```bash
python manage.py seed_demo --reset
```

```bash
python manage.py dispatch_jobs
```

`seed_demo` rebuilds the fictional demo network and works only with `ENVIRONMENT=local` and `DEMO_MODE=true`. `dispatch_jobs` runs one pass of the email, expiry, alert and digest dispatcher.

API: interactive docs at `/api/docs/`, and the [frontend API contract](docs/frontend_api_contract.md). Dependencies: edit `requirements.in`, then regenerate the hash-locked `requirements.txt` with pip-tools 7.6.1.
