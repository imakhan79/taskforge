# Architecture

```
                         USER
                          │
                 ┌────────▼─────────┐
                 │   Next.js Web    │  landing, dashboard, auth
                 │    Platform      │  Server Components + Route Handlers
                 └────────┬─────────┘
                          │ REST (+ shared-secret header to agent-service)
          ┌───────────────┼──────────────────┐
          ▼               ▼                  ▼
   ┌──────────┐    ┌─────────────┐    ┌─────────────┐
   │ Supabase │    │ Agent       │    │ Worker      │
   │ Postgres │◄───┤ Service     │◄───┤ (scheduler) │
   │ Auth     │    │ (FastAPI)   │    │ independent │
   │ Storage  │    └──────┬──────┘    │ process     │
   │ Realtime │           │           └──────┬──────┘
   └────┬─────┘           ▼                  │
        │           ┌───────────┐            │
        │           │ Tool      │◄───────────┘
        │           │ Registry  │  (claim_due_tasks RPC)
        │           └─────┬─────┘
        │        ┌────────┼────────┐
        │        ▼        ▼        ▼
        │     Email/CRM  HTTP   Notifications
        │     Spreadsheet (SSRF
        │     Database    guarded)
        │        │        │        │
        │        └────────┴────────┘
        │                 │
        └──── execution_events, task_executions ◄┘
                          │
                    Supabase Realtime
                          │
                    Next.js Dashboard
```

## Why two services

The Next.js app never runs an automation itself. It authenticates the user,
enforces RLS-backed authorization, and calls the Python **agent-service**
over HTTP for anything AI- or execution-related (`/agent/plan`,
`/agent/execute`, `/agent/resume`, `/agent/verify`). The agent-service is a
separate, independently deployable process (and the **worker** is a third,
also independent, process) specifically so long-running or scheduled
automation work is never tied to a Vercel-style serverless function's
lifetime — closing the browser, or Next.js redeploying, doesn't interrupt a
run.

## The pipeline (spec section 4)

1. **Understand** — `app/planner/intent_analyzer.py` extracts an obvious
   trigger cadence from the instruction with plain regex (cheap, no model
   call).
2. **Plan** — `app/planner/planner.py` uses a Strands `Agent` with
   `structured_output(Plan, ...)` against the configured model (Gemini by
   default, Anthropic supported) to turn the instruction + tool catalog
   into a validated `Plan` Pydantic model. The model can never influence
   execution except through this one, fully-typed artifact.
3. **Persist** — the Next.js API (`/api/tasks`) writes the plan as a
   `tasks` + `task_steps` row set. Nothing about execution is decided yet.
4. **Trigger** — manual (`POST /api/tasks/[id]/run` → `/agent/execute`) or
   scheduled (the worker's `claim_due_tasks()` Postgres function, using
   `FOR UPDATE SKIP LOCKED` so concurrent workers never double-claim).
5. **Execute** — `app/executor/execution_engine.py` walks the ordered
   steps. For each: resolve the tool via `ToolRegistry`, check risk via
   `RiskEngine` (reads `tool_definitions`, not the LLM's opinion), pause for
   `ApprovalEngine` if risk crosses the org's threshold, run
   `tool.execute()`, then `VerificationEngine` re-checks the system of
   record before the step counts as done. Failures go through
   `RecoveryEngine` (retry with backoff) and escalate to a human if retries
   are exhausted.
6. **Report** — `ReportingEngine` computes real counts and a time-saved
   estimate from the actual step results; this becomes `output_data` and
   what the dashboard renders — never a free-text success claim.
7. **Observe** — every event is written to `execution_events` and
   `task_executions.status`; Supabase Realtime pushes it to the dashboard
   under the viewer's own RLS-scoped subscription, so no polling.

## Module boundaries (agent-service)

Each of these is its own directory under `agent-service/app/`, not a
function inside a shared file: `planner`, `policies`, `security`
(risk engine, SSRF guard, prompt-injection defense), `approvals`,
`executor`, `verifier`, `recovery`, `memory`, `reporting`, `tools`
(registry + mock adapters + the real SSRF-guarded HTTP tool), `database`
(the only place table shapes are known), `api` (FastAPI routes), `agents`
(model provider selection).

## State machine

`task_executions.status` follows a fixed transition table
(`app/models/enums.py::ALLOWED_TRANSITIONS`) enforced in the executor, not
just hidden in the UI — an illegal transition raises
`IllegalTransitionError` rather than silently happening.

## Known simplifications (see also README "Known Limitations")

- The mock "system of record" (emails, CRM, spreadsheets, database tables)
  lives in-process, per organization. It genuinely supports search/read/
  write/verify like a real integration would, but does not persist across
  an agent-service restart.
- Google Workspace / Microsoft 365 / Slack integrations are modeled
  (`integrations` table, "not connected" status) but have no real OAuth
  flow — there's no registered OAuth app to test against in this
  environment. The tool interface they'd implement is identical to the
  mock tools, so adding them is additive, not a rewrite.
