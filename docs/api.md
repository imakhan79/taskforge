# API Reference

All Next.js routes require a signed-in session (cookie-based). All
agent-service routes require the `X-Agent-Service-Secret` header to match
`AGENT_SERVICE_SECRET` — the Next.js server is the only intended caller.

## Next.js — `/api/*`

| Method | Path | Notes |
|---|---|---|
| GET | `/api/tasks?organization_id=` | List tasks for the org |
| POST | `/api/tasks` | See below — three request shapes |
| GET | `/api/tasks/[id]?organization_id=` | Task + its steps |
| PATCH | `/api/tasks/[id]` | Update `name`, `description`, `status`, `schedule` |
| DELETE | `/api/tasks/[id]` | Archives (not a hard delete) |
| POST | `/api/tasks/[id]/run` | Forwards to agent-service `/agent/execute` |
| POST | `/api/tasks/[id]/pause` | Sets `status='paused'` |
| POST | `/api/tasks/[id]/resume` | Sets `status='active'` (re-arms the schedule) |
| GET | `/api/executions?organization_id=&task_id=&status=` | List executions |
| GET | `/api/approvals?organization_id=&status=` | List approvals (default `pending`) |
| POST | `/api/approvals/[id]/approve` | Manager+ only; forwards to `/agent/resume` |
| POST | `/api/approvals/[id]/reject` | Manager+ only; forwards to `/agent/resume` |
| GET | `/api/metrics?organization_id=` | Dashboard aggregate numbers |
| GET | `/api/audit-logs?organization_id=&limit=` | Audit trail |

### `POST /api/tasks` request shapes

```jsonc
// 1. Ask the planner, review before creating anything
{ "natural_language_instruction": "...", "dry_run": true }
// -> { "plan": { ... } }

// 2. Create from a plan already produced (and possibly edited) by #1
{ "natural_language_instruction": "...", "plan": { ... } }
// -> { "task": { ... } }

// 3. Create from a template (no AI call)
{ "template_id": "uuid" }
// -> { "task": { ... } }
```

## Agent service — `/agent/*`

| Method | Path | Body | Notes |
|---|---|---|---|
| GET | `/agent/health` | — | Tool registry status |
| POST | `/agent/plan` | `{ instruction, organization_id }` | Returns a validated `Plan`; 503 if `AI_API_KEY` isn't configured |
| POST | `/agent/execute` | `{ task_id, organization_id, trigger_source, idempotency_key? }` | 202, runs in the background, returns `{ execution_id, status }` |
| POST | `/agent/resume` | `{ approval_id, decision, decided_by }` | Wakes a `WAITING_APPROVAL` execution after the decision is already recorded |
| POST | `/agent/verify` | `{ execution_id }` | Re-runs each step's `verify()` against the current system of record |

## Errors

Every error response is `{ "error": "human-readable message" }` with an
appropriate status code (400 validation, 401/403 auth, 404 not found, 409
conflict, 502/503 upstream/agent-service problems). The frontend never
synthesizes a success message from a non-2xx response.
