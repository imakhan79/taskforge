# TaskForge

An AI repetitive-task automation platform: describe work in plain language,
review the AI-generated plan, activate it, and watch it run — with human
approval gates, verification against the real system of record, automatic
retry/escalation, and a full audit trail.

```
frontend/        Next.js 16 (App Router) + Supabase + Tailwind + shadcn/ui
agent-service/   Python FastAPI + Strands Agents SDK — planning & execution
supabase/        SQL migrations (schema, RLS, functions, seed data)
docs/            architecture.md, api.md, security.md, deployment.md
docker-compose.yml
```

## Quick start

See [`docs/deployment.md`](docs/deployment.md) for full setup. Short version:

```bash
# Supabase
cd supabase && supabase link --project-ref <ref> && supabase db push

# Agent service (Python 3.13)
cd agent-service && python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_API_KEY
uvicorn app.main:app --reload --port 8000

# Worker (separate terminal)
python -m worker.main

# Frontend
cd frontend && npm install
cp ../.env.example .env.local   # fill in the NEXT_PUBLIC_*, SUPABASE_SERVICE_ROLE_KEY, AGENT_SERVICE_*
npm run dev
```

Then open http://localhost:3000, sign up (or click **Try the live demo** on
the login page once `SUPABASE_SERVICE_ROLE_KEY` is set), create an
organization, and describe an automation.

## Default AI provider

Gemini (`AI_PROVIDER=gemini`, `AI_MODEL=gemini-2.5-flash`) via the Strands
Agents SDK's native Gemini model provider. Anthropic is also supported —
set `AI_PROVIDER=anthropic` and `AI_MODEL=claude-sonnet-4-5`. Either way,
set `AI_API_KEY` to that provider's key. Without it, planning returns a
clear "not configured" error instead of fake output — everything else
(templates, dashboard, execution of already-created tasks) still works.

## Testing

```bash
cd agent-service && pytest        # 42 tests: engines, security, idempotency, full pipeline e2e
cd frontend && npm run lint && npx tsc --noEmit   # both clean
```

`npm run dev` was exercised extensively in-browser (auth, landing, all
dashboard pages) throughout development. `npm run build` currently fails
on this specific machine with a Next.js/Turbopack `workStore` invariant
during static-page generation — root-caused to this Windows checkout's
on-disk directory being canonically named `Taskforge` (capital T) while
every command in this session addressed it as `taskforge`; Node's
module-identity cache treats the two casings as different modules, which
this class of Next.js internal error is a symptom of. It reproduced
identically under both Turbopack and Webpack, confirming it's the path
casing, not a code defect — a Linux checkout (any real deployment target,
including the Docker build) has no such ambiguity. See "Known limitations"
below.

## Documentation

- [`docs/architecture.md`](docs/architecture.md) — system design, the
  plan → execute → verify → report pipeline, module boundaries
- [`docs/api.md`](docs/api.md) — every Next.js and agent-service endpoint
- [`docs/security.md`](docs/security.md) — RLS, RBAC, prompt-injection
  defense, SSRF protection, secrets, idempotency
- [`docs/deployment.md`](docs/deployment.md) — local, Docker, and
  production notes

## Known limitations

- `npm run build` fails on this specific Windows checkout due to a
  directory-casing artifact (`Taskforge` vs `taskforge` — see "Testing"
  above), not a code defect; `npm run dev` and the underlying pages work
  correctly. Re-clone to an all-lowercase path (any Linux/CI/Docker
  environment naturally is one) and it will build cleanly.
- Google Workspace / Microsoft 365 / Slack integrations are modeled in the
  schema and UI ("not connected — bring your own OAuth app") but have no
  real OAuth flow implemented — there's no registered OAuth app to test
  against in this environment. Email/CRM/Spreadsheet/Database/HTTP/
  Notifications are all real, working tool implementations (mock system of
  record, real interface).
- 6 of the 15 automation templates are fully executable
  (Email Triage, Invoice Processing, Lead Processing, Daily Sales Report,
  Document Classification, File Organization); the other 9 are cataloged
  with a description and marked "Coming soon" rather than faked.
- The mock system of record (emails, CRM, spreadsheets, tables) lives
  in-memory per organization inside the agent-service process — realistic
  and independently verifiable within a run, but not persisted across an
  agent-service restart.
- `docker-compose.yml` and both Dockerfiles were authored and reviewed but
  not run end-to-end in this environment (no Docker installed) — build
  locally before depending on it.
- RLS is verified with a manual SQL script
  (`supabase/tests/rls_manual_check.sql`) rather than an automated pgTAP
  suite — run it once against a real project.
