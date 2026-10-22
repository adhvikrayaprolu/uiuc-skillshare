# Ranking, trust and security plan

How Illini SkillShare decides who to show you, how feedback earns trust without being gameable, and how the app defends itself. Items marked **Done** ship in this change; the rest are planned and tracked in GitHub issues.

## Problems with the first ranking

| Problem | Effect |
|---|---|
| Endorsements were counted but never ranked | Being endorsed for Python didn't help in a Python search |
| Ratings were skill-blind | A 5★ Resume Review session boosted the same person in a Python search |
| No reliability signal | Someone who lets requests expire ranked the same as someone who replies quickly |
| Availability was a constant | Search never compared your free times with theirs |
| No load balancing | One popular helper could top every search and be flooded |
| "Highest rated" sorted by raw average | One 5★ review beat twenty 4.8★ reviews |
| Repeat feedback counted repeatedly | Two friends could trade many quick sessions to inflate each other |
| No typo tolerance | "pyhton" found nobody |
| Swap matches ignored trust | Two-way matches were ordered only by skill overlap and shared times |

## Ranking v2 (Done)

Every candidate still passes the same eligibility and privacy policy first: active Illinois members, published profiles, open to requests, no block either way. Ranking then combines:

| Signal | Weight | What it measures |
|---|---:|---|
| Relevance | 55% | Offered skills matching the search (exact skills first), plus profile text; unchanged from v1 |
| Skill trust | 12% | Endorsements and reviews **for the skills you searched**, one per distinct member, saturating (3 pieces of evidence ≈ half credit) |
| Availability fit | 10% | Whether their weekly times overlap yours; neutral when either side hasn't set times |
| Reliability | 8% | Average rating with a neutral prior of five 3★ reviews, **one vote per reviewer** |
| Responsiveness | 8% | Share of incoming requests in the last 180 days they accepted or declined instead of letting expire, with a neutral prior |
| Self-declared level | 4% | Advanced > intermediate > beginner for the matched skill; small because it's unverified |
| Recently active | 3% | Confirmed their availability in the last 30 days |

Then, **load balancing**: someone with three or more requests already waiting on them gets a small penalty, so new requests spread out instead of piling onto one person.

Each signal shows up as a plain reason on the card only when it's real, for example "Endorsed for Python by 3 members.", "You're both free Tue evening." or "Answered 9 of 10 recent requests." Scores are never shown as percentages or as verified expertise.

**Recommendations** ("Teaches what you want to learn") use the same ranking for your learning goals and leave out people you already have an open request with; they're in your inbox. **Swap matches** keep skill overlap and shared times first, then break ties by reliability and responsiveness. **Highest rated** sorting uses the same prior-weighted average, so a single review can't top the list.

**Typo tolerance:** search words that don't match a skill exactly are compared with approved skill names and aliases, so "pyhton" or "figam" still find Python or Figma, and the response reports the correction.

## Anti-gaming rules (Done)

- Feedback still requires a **completed** request, and each person can review and endorse once per request.
- For ranking, each reviewer counts **once** per person they review, no matter how many sessions they complete together; endorsements are already unique per member, person and skill.
- Feedback from members the viewer can't see (blocked, private, suspended, deleted) never counts.

## Security hardening (Done)

| Control | Detail |
|---|---|
| Content-Security-Policy | Django 6.1's built-in middleware: scripts, styles, fonts and connections only from this site, images also from `data:`/`blob:` and the avatar store, no framing, no plugins, forms only to this site. Google's sign-in origins are added only when Google is configured. The API explorer gets a narrow exception for its CDN assets. |
| Permissions-Policy | Camera, microphone, geolocation, payment, USB and other device features are disabled. |
| Write limits | On top of 600 requests a minute: 20 new requests an hour, 30 pieces of feedback an hour and 10 reports an hour per member, so spam can't flood inboxes or moderators. |

Existing protections stay: Illinois-email sessions with CSRF, HTTPS with HSTS and secure cookies in production, frame denial, sign-in code limits, five waiting requests per member, server-enforced consent before contact, least-privilege database roles and production checks that refuse unsafe settings.

## Later (tracked as issues)

- **Report a review** from the profile page (the model already supports it) and let moderators hide a review.
- **Ignore feedback from sessions completed within minutes of acceptance**, once real data shows how long genuine sessions take (needs an owner decision on the threshold).
- **Collaborative signals**: "people who learned Figma from Sam also learned from…", once there's enough real completed-swap data to avoid bias.
- **Offline evaluation** of ranking v2 against the labeled fixtures with per-signal ablations, and live A/B checks once there are real users.
