# Engineering control plane

UIUC students discover peers by skills, maintain a profile and exchange help requests.

## Setup and validation
Create backend/.venv, install backend/requirements.txt, npm ci --prefix frontend, copy backend/.env.example and frontend/.env.example to their .env files. Migrate/seed backend. Run backend at 8000 and frontend at 5173 in separate terminals. Root startup simplification remains an issue. Use make check PYTHON=/absolute/path/to/backend/.venv/bin/python after setup.

## Verified state
Published main audit SHA: `4597b4f4d90c19f8a11853785e42a953ef8254d3`. No root AGENTS.md, issues or PRs existed at this audit. Existing main CI validates 35 backend tests and frontend lint/build; no frontend interaction suite.

## Unmerged work
Earlier local branch `codex/skillshare-validation-onboarding` at `fdc1860e2a332f1e2d4dea0ed39bb493cb7aedf1` has tested improvements, but is not hosted or merged. Review/reuse it before reimplementing. Its reported checks are not checks of this control-plane branch.

## Backlog and stop rule
Use GitHub issues after publication; local draft identifiers must never be treated as GitHub issue numbers. Portfolio tracking covers core flows, safe configuration, meaningful tests, green PR CI, reproducible setup and concise demo documentation. Stop after the tracker is complete; no speculative features.

## Queue
`is:issue is:open label:"automation:ready" sort:updated-asc` scoped to this repository. Apply priority and dependency checks from AGENTS.md.
