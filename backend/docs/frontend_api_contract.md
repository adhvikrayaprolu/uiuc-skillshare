# Frontend API Contract

## Auth Flow

1. Frontend signs in with Google.
2. Frontend sends the Google ID token to `POST /api/auth/google/`.
3. Backend validates the token, requires `@illinois.edu`, and returns `access`, `refresh`, and `user`.
4. Frontend sends `Authorization: Bearer <access>` on authenticated requests.
5. On `401`, call `POST /api/auth/token/refresh/`.

## Startup After Login

Call `GET /api/bootstrap/`.

Use response fields:
- `has_profile`: route to onboarding if false.
- `profile.profile_completeness`: show completion nudges.
- `skill_categories` and `popular_skills`: hydrate forms/search controls.
- `dashboard`: render dashboard summary.

## Onboarding Flow

Call `GET /api/onboarding/status/` to show missing steps.

Create profile:
```json
POST /api/profiles/me/
{
  "display_name": "Riya Patel",
  "major": "Computer Science",
  "year": "junior",
  "headline": "Product designer for student startup teams",
  "bio": "I help teams prototype ideas in Figma.",
  "preferred_contact_method": "linkedin"
}
```

Then add skills, contact methods, availability, and credentials via `/api/profiles/me/...`.

## Discovery Flow

Use `GET /api/discovery/search/?q=figma&availability_time=evening`.

Results include:
- `match_score`
- `match_reasons`
- lightweight profile fields
- top skills/categories
- rating counts

Use `GET /api/discovery/recommended/` for the dashboard recommendation rail.

## Public Profile Flow

Use `GET /api/profiles/{id}/`.

Public detail includes public contact methods only, public credentials only, reviews preview, endorsement summary, availability, and profile skills.

Use `GET /api/profiles/{id}/similar/` for similar profile suggestions.

## Save Profile Flow

```json
POST /api/saved-profiles/
{
  "saved_profile": 3,
  "note": "Could help with Figma and startup ideas"
}
```

## Help Request Flow

Create:
```json
POST /api/help-requests/
{
  "helper_profile": 3,
  "topic": "Resume feedback",
  "message": "Would you be open to reviewing my resume?",
  "urgency": "medium"
}
```

Update:
```json
PATCH /api/help-requests/{id}/
{
  "status": "accepted",
  "response_message": "Sure, send me a few times."
}
```

## Review And Endorsement Flow

Review:
```json
POST /api/profiles/{id}/reviews/
{
  "rating": 5,
  "comment": "Very helpful and specific."
}
```

Endorse:
```json
POST /api/profiles/{id}/endorsements/
{
  "skill": 12,
  "note": "Great Figma feedback."
}
```

## Contact Click Tracking

When a user clicks a public contact method:
```json
POST /api/profiles/{id}/contact-click/
{
  "contact_method_id": 12
}
```

This records analytics only; it does not message the student.
