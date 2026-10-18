# Local walkthrough

Use the root Docker launch and local Mailpit inbox. Create two different synthetic Illinois-email accounts through the actual code flow, complete onboarding, then request → accept → coordinate → complete → review. See [browser verification](../../docs/browser-verification.md) for automated evidence.

`make browser-check` temporarily seeds clearly labeled synthetic pagination fixtures and removes its own users afterward. It requires the existing local Compose stack; do not run against hosted services. Normal startup creates taxonomy only. No development login endpoint bypasses verification.
