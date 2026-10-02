# Product overview

An eligible member creates an offered-skill profile, finds a peer, requests help, coordinates through consented contacts after acceptance, completes the request and leaves feedback. Illinois-email access is not verified enrollment or university endorsement.

Learning goals are private and drive recommendations. Offered skills and HTTP/HTTPS evidence links are self-declared. New profiles start private through the API; onboarding asks the member to choose publication and contact consent. Private/blocked/inactive/demo peers are excluded from discovery, direct access, nested contacts, feedback and personal statistics.

Requests start pending. Only the helper accepts/declines; the seeker cancels; either participant completes accepted help. Versions detect stale transitions; idempotency prevents duplicate submissions. Reviews reference completed help and endorsements reference its skill. Accepted and completed interactions remain in Connections.

Notifications persist read state. Optional email uses a retryable SQL outbox/RQ worker; SMTP failure cannot roll back a help request. Avatar replacement/deletion also uses durable cleanup jobs. Admin handles reports, taxonomy approval and suspension with audit records; network analytics are staff-only.

[Matching](matching.md) describes relevance, availability, reliability and recent willingness signals. Paid semantic retrieval stays disabled; no qualifications are invented. No live chat, scheduling, resume/transcript uploads or hosted deployment is included.
