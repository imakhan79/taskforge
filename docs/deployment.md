# Deployment

## Local development (no Docker)

```bash
# 1. Supabase — create a project, then:
cd supabase && supabase link --project-ref <ref> && supabase db push

# 2. Agent service
cd agent-service
python -m venv .venv && .venv/Scripts/activate  # (or source .venv/bin/activate on macOS/Linux)
pip install -r requirements.txt
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, AI_API_KEY
uvicorn app.main:app --reload --port 8000

# 3. Worker (separate terminal, same venv/.env)
python -m worker.main

# 4. Frontend
cd frontend
npm install
cp ../.env.example .env.local   # fill in NEXT_PUBLIC_* + SUPABASE_SERVICE_ROLE_KEY + AGENT_SERVICE_*
npm run dev
```

Visit http://localhost:3000.

## Docker

```bash
cp .env.example .env   # fill in every value
docker compose up --build
```

This starts three containers: `frontend` (port 3000), `agent-service` (port
8000), and `worker` (no exposed port — polls Supabase directly). All three
read the same root `.env`.

> This repository's Dockerfiles and `docker-compose.yml` were authored and
> reviewed but not exercised with `docker compose up` in this environment
> (Docker Desktop was not installed on the machine this was built on) — run
> a build locally before relying on it in production.

## Production notes

- **Never** deploy the agent-service or worker as a Vercel/Next.js
  serverless function — both are long-running or need to survive
  independently of any single HTTP request (spec section 3). Run them as
  standard containers/processes (ECS, Cloud Run, a VM, Fly.io, etc.).
- The frontend can deploy to Vercel or any Node host; set
  `AGENT_SERVICE_URL` to the agent-service's public/internal URL.
- Rotate `AGENT_SERVICE_SECRET` and confirm both the frontend and
  agent-service are redeployed with the new value together — a mismatch
  fails every `/agent/*` call closed (401), not open.
- Apply `supabase/migrations/*.sql` in order (`supabase db push`) before
  first deploy; `005_seed_data.sql` and `006_storage.sql` are idempotent to
  re-run, `001`-`004` are not (they create types/tables).
