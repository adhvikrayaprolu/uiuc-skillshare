# Project
UIUC SkillShare helps Illinois-email members discover peers, request help and exchange feedback after completed interactions.

# Architecture
React/TypeScript in frontend; Django REST accounts, profiles, taxonomy, discovery and interactions in backend. PostgreSQL/pgvector is canonical; Redis supports throttling and RQ jobs. Django sessions and CSRF protect browser requests. Django is the authorization boundary; Supabase is a future database/private-storage provider.

# Local Development and Validation
Use the root README: copy .env.example, then docker compose up --build --wait. Run make check for PostgreSQL, frontend, browser/accessibility, production configuration, permissions and backup/restore checks. Native editing instructions are in docs/development.md; native SQLite is not the complete validation baseline.

# Frontend Rules
Reuse the existing design system and components. Use Figma MCP before substantial redesign. Preserve keyboard access and responsive layouts; test loading/error/empty states.

# Backend and Testing Rules
Enforce ownership, verified membership, privacy, blocking, contact consent and request transitions on the server. Preserve atomic saves. Test rollback, authorization, concurrency and provider failure paths. Use local services/fakes. Never use real paid/cloud integrations without explicit authorization; semantic calls default disabled with allowance zero. Measure performance before claiming improvements.

# GitHub Workflow
Audit issue #5, open issues and open PRs before selecting work. Reuse active implementations; do not duplicate them. Use a dedicated codex/<issue>-<scope> branch and a draft PR linked to its real issue. Default to main; stack dependent work only when explicitly authorized and document its base. Report exact local/hosted verification separately. Issues close on human merge; never merge or enable auto-merge.

# Do Not
Never commit secrets, copy real environment files, deploy, create cloud resources, rotate credentials, rewrite history or change unrelated repositories. Preserve user work. Once infrastructure is supported by verified setup/tests/CI/documentation and accepted review, record STABLE and stop unnecessary tooling churn.

# Automation Issue Selection
Work on one coherent non-duplicated milestone unless the user explicitly authorizes a larger implementation. Respect blocked/human-review/do-not-touch labels and dependency ordering. If real credentials or decisions block live verification, preserve reviewable work and report that exact gap. Do not treat draft implementation as merged main.
