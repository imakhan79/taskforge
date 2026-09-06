# Security

## Multi-tenancy & RLS

Every tenant table has `organization_id` and RLS enabled
(`supabase/migrations/002_rls.sql`). Reads are granted to org members via
their own JWT (so Supabase Realtime only ever streams a subscriber's own
org). Writes to agent-owned tables (`task_executions`, `execution_events`,
`memories`, `audit_logs`, `integration_credentials`, `agent_metrics`) are
**not** granted to the `authenticated` role at all — only the service role
(used exclusively by the agent-service and a few Next.js server-only
helpers) can write them. This means a compromised or buggy browser session
can never fabricate execution state, forge an audit entry, or read another
org's secrets, regardless of what the UI does.

### Manual RLS verification

Run `supabase/tests/rls_manual_check.sql` (see file for exact steps) with
two seeded users in two different organizations to confirm: a member of
org A cannot select/insert/update any row belonging to org B, across
`tasks`, `task_executions`, `approvals`, and `audit_logs`.

## RBAC

Five roles (`owner > admin > manager > member > viewer`), enforced by the
`has_org_role()` Postgres function inside RLS policies (not just hidden UI
buttons): viewers are read-only everywhere; members can create/run their
own tasks; managers can edit any task and decide approvals; admins manage
integrations, tool permissions, and org settings; only an owner's row is
protected from role changes by another admin.

## Prompt injection

Content that did not originate from TaskForge itself (email bodies,
document text, HTTP responses, CRM notes) is never concatenated directly
into a model prompt. `app/security/prompt_injection.py::wrap_untrusted()`
fences it and tells the model explicitly to treat it as inert data;
`looks_like_injection()` flags the common attack phrasing
("ignore previous instructions", "send all customer data to...") for
logging. See `tests/test_prompt_injection.py`.

## SSRF protection

The HTTP tool (`app/tools/http_tool.py`) is the only tool capable of
reaching a real network. Every URL — including every redirect hop, up to 3
— is resolved and each resolved IP is checked in
`app/security/ssrf_guard.py`: private/loopback/link-local/reserved ranges
and the cloud metadata addresses (`169.254.169.254`, EC2's IPv6 metadata
address) are rejected, along with non-http(s) schemes. See
`tests/test_ssrf_guard.py`.

## Secrets

- `SUPABASE_SERVICE_ROLE_KEY` and `AI_API_KEY` are read only in
  `server-only`-guarded modules (`lib/supabase/admin.ts` on the frontend;
  `app/config.py` on the agent-service) — importing either into a Client
  Component is a build-time error, not a runtime leak.
- `integration_credentials` has RLS enabled with **zero** policies for
  `anon`/`authenticated` — only the service role can ever read it.
- Nothing in `execution_events.event_data` or the dashboard exposes model
  chain-of-thought; only operational facts (tool name, output, verified
  flag) are recorded, per spec section 37.

## Rate/cost limits

`app/policies/policy_engine.py` enforces per-organization limits stored in
`organizations.settings` (max daily executions, max tool calls per
execution, max retries, max concurrent tasks, max AI budget) before a run
starts and on every tool call; hitting one fails the execution with a
clear reason rather than continuing silently over budget.

## Idempotency

Every execution has a unique `(task_id, idempotency_key)` constraint at
the database layer. Record-creating mock tools (tickets, leads, database
records, sent emails) additionally dedupe within a single execution+step
via `app/tools/mock/store.py::with_idempotency`, so a retried step cannot
create a duplicate record. See `tests/test_mock_tools_idempotency.py` and
`tests/test_execution_engine_e2e.py::test_rerunning_a_completed_execution_is_a_no_op`.
