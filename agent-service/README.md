# TaskForge Agent Service

Python/FastAPI service implementing the planning and execution pipeline
described in `../docs/architecture.md`. Independently deployable from the
Next.js frontend — see `../docs/deployment.md`.

## Layout

```
app/
  agents/      model provider selection (Gemini default, Anthropic supported)
  planner/     intent analysis (regex) + LLM-backed structured plan generation
  policies/    cost/action limit enforcement
  security/    risk scoring, SSRF guard, prompt-injection defense
  approvals/   human-in-the-loop gate
  executor/    the state machine that actually runs a task's steps
  verifier/    re-checks the system of record before a step counts as done
  recovery/    retry with backoff, then escalate
  memory/      short-term/task/organization/operational memory
  reporting/   real counts + time-saved summary
  tools/       ToolRegistry + mock adapters (email, files, documents,
               spreadsheet, crm, database, notifications) + the real,
               SSRF-guarded HTTP tool
  database/    the only place table shapes are known (repository.py)
  api/         FastAPI routes: /agent/plan, /execute, /resume, /verify, /health
worker/        independent scheduler process (claim_due_tasks + cron)
tests/         42 tests incl. a full plan→approve→execute→verify e2e run
               against an in-memory fake Supabase client (no network needed)
```

## Run

```bash
python -m venv .venv && .venv/Scripts/activate
pip install -r requirements.txt
cp .env.example .env   # SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_API_KEY
uvicorn app.main:app --reload --port 8000     # API
python -m worker.main                          # scheduler, separate process
pytest                                          # tests (no .env needed)
```

Every `/agent/*` request must carry `X-Agent-Service-Secret` matching
`AGENT_SERVICE_SECRET`. `/agent/plan` returns 503 if `AI_API_KEY` isn't set.
