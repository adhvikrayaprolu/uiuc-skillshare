# Browser API contract

Django authorizes verified eligible members. Use same-origin requests with cookies (`credentials: include`); unsafe methods also send `X-CSRFToken` from the current `csrftoken` cookie. Never store access tokens in localStorage. Domain schemas are at `/api/schema/` and `/api/docs/`; the allauth-based authentication endpoints below are documented separately.

## Authentication

| Endpoint | Behavior |
|---|---|
| GET `/api/auth/csrf/` | CSRF bootstrap and `googleEnabled`; obtain before unsafe requests and again after login. |
| POST `/api/auth/email/request/` | `{email}` with exact Illinois domain; returns allauth 401/code-required response without authenticating. Local codes arrive in Mailpit. |
| POST `/api/auth/email/confirm/` | `{code}`; success 200 creates a server-controlled session. Five-minute expiry, three failed attempts; replay/stale process fails. |
| POST `/api/auth/email/resend/` | Throttled resend within the active verification process. |
| POST `/api/auth/google/` | `{provider:"google", process:"login", token:{client_id, id_token}}`; configured audience and authoritative Illinois ownership required. Non-authoritative ownership falls back to an email code. |
| GET / PATCH `/api/auth/me/` | Current member and editable account preferences; session restoration uses GET. |
| POST `/api/auth/logout/` | Deletes server session; client clears account-specific query/cache state. |
| GET `/api/auth/export/` | Own account data download, no-store. |
| POST `/api/auth/delete/` | `{confirmation:"<own account email>"}`; confirmed deletion/session revocation and durable avatar cleanup. |

Allauth validation errors use `{status, errors:[{message,...}]}`; domain APIs use DRF field/detail errors. Suspended/inactive/demo users cannot authenticate. JWT refresh/developer-login routes are absent. A 401 domain response expires frontend session state; refresh cannot resurrect it.

## Profiles / taxonomy

GET `/api/bootstrap/` supplies current user/profile, approved categories/skills and dashboard tasks; GET `/api/onboarding/status/` supplies missing steps. PUT `/api/profiles/me/aggregate/` atomically saves `{profile, skills?, availability?, contacts?, credentials?}`. Omitted relation lists are preserved; supplied lists replace that relation. Field errors roll back the entire save. Profile fields include learning goals, contact/embedding/email consent and visibility; evidence uses HTTP/HTTPS links. POST `/api/profiles/me/avatar/` uses multipart `avatar` (up to 2 MB, 4096px input); GET `/api/profiles/<id>/avatar/` enforces peer privacy.

GET `/api/profiles/` and `/api/profiles/<id>/` show visible peers only. Selected contact methods appear only after accepted/completed interaction and sharing consent; block/privacy/removal revokes access. Authentication emails and private goals never appear in public serializers. GET `/api/skills/`, `/api/skill-categories/` and `/api/skills/popular/` supply taxonomy; POST `/api/skills/suggest/` creates a pending suggestion for staff approval.

## Discovery and pagination

GET `/api/discovery/search/` accepts `q`, `mode`, taxonomy `skills`/`category`, `availability_day`/`availability_time`, `open_to_connect` and explicit background filters. GET `/api/discovery/recommended/` uses private learning goals or clearly labeled discovery suggestions. Responses retain `{count,next,previous,results,matching}`. Matching metadata reports actual mode, fallback reason, candidate limit/truncation and recommendation basis. Reasons come from facts; match scores are internal ordering values, not probabilities. [Matching design](../../docs/matching.md) specifies weights and semantic gates.

Follow pagination for discovery, saved profiles, requests, notifications and taxonomy. Discovery pages are server-backed; finite personal lists retain all server pages and the UI pages them in groups of 20. A candidate cap bounds ranking and is disclosed; it is not the entire campus count.

## Requests / feedback

POST `/api/help-requests/` accepts helper profile, offered skill, topic/message, urgency/preferred contact and a UUID `idempotency_key`; new status is always pending. GET lists/retrieves participant history. PATCH `/<id>/` accepts the next `status`, current `version` and optional response message; stale conflicts return 409. Participants/content cannot be reassigned. The helper accepts/declines; seeker cancels; either participant completes accepted help. Identical retries are idempotent and do not duplicate notifications. Accepted/completed help remains in Connections.

POST `/api/profiles/<id>/reviews/` and `/endorsements/` require a completed `help_request`; review is unique per request and endorsement uses its offered skill. Feedback confirms an interaction, not independent expertise. Saved profiles use `/api/saved-profiles/`; blocked/private entries are suppressed. POST `/api/blocked-users/`, DELETE `/<id>/` and POST `/api/reports/` back the corresponding Settings/profile controls. Blocking cancels active requests and scrubs their contact/message data.

## Notifications and statistics

GET `/api/notifications/` includes paginated results plus `unread_count`; POST `/<id>/read/` and `/read-all/` persist read state. Transactional domain events create notifications; optional email retries independently. GET `/api/dashboard/` and `/api/analytics/summary/` respect peer visibility in personal counts. Network administration is staff-only at `/api/admin/analytics/summary/`.

Health endpoints are unauthenticated: `/api/health/live/` (process) and `/api/health/ready/` (PostgreSQL and Redis). Provider outages return truthful fallback/error states; email failures do not roll back requests.
