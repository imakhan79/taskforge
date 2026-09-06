-- ============================================================================
-- TaskForge initial schema
-- Extensions, enums, and tables. No RLS/policies here (see 002_rls.sql),
-- no non-PK/FK indexes here (see 003_indexes.sql), no functions/triggers here
-- (see 004_functions.sql), no seed data here (see 005_seed_data.sql).
-- ============================================================================

create extension if not exists "pgcrypto";      -- gen_random_uuid()

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type org_role as enum ('owner', 'admin', 'manager', 'member', 'viewer');
create type org_plan as enum ('free', 'pro', 'enterprise');
create type org_status as enum ('active', 'suspended');
create type agent_status as enum ('active', 'inactive', 'archived');
create type task_status as enum ('draft', 'active', 'paused', 'archived');
create type risk_level as enum ('low', 'medium', 'high', 'critical');
create type trigger_type as enum ('manual', 'schedule', 'webhook', 'event');

-- Execution state machine, per spec section 9.
create type execution_status as enum (
  'DRAFT', 'PLANNED', 'WAITING_APPROVAL', 'QUEUED', 'RUNNING', 'VERIFYING',
  'COMPLETED', 'FAILED', 'RETRYING', 'PAUSED', 'CANCELLED', 'ESCALATED'
);

create type approval_status as enum ('pending', 'approved', 'rejected', 'expired');
create type integration_status as enum ('connected', 'disconnected', 'error');
create type memory_scope as enum ('short_term', 'task', 'user', 'organization', 'operational');
create type verification_status as enum ('pending', 'passed', 'failed', 'skipped');

-- ---------------------------------------------------------------------------
-- Core tenancy
-- ---------------------------------------------------------------------------

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  plan org_plan not null default 'free',
  status org_status not null default 'active',
  -- limits + policy config: max_daily_executions, max_execution_duration_seconds,
  -- max_tool_calls, max_retries, max_api_calls, max_concurrent_tasks,
  -- max_ai_budget_usd, approval_risk_threshold (one of risk_level)
  settings jsonb not null default '{
    "max_daily_executions": 200,
    "max_execution_duration_seconds": 900,
    "max_tool_calls_per_execution": 40,
    "max_retries": 3,
    "max_api_calls_per_execution": 60,
    "max_concurrent_tasks": 10,
    "max_ai_budget_usd_daily": 20,
    "approval_risk_threshold": "high"
  }'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table organization_members (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role org_role not null default 'member',
  created_at timestamptz not null default now(),
  unique (organization_id, user_id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Agents, tasks, steps, triggers
-- ---------------------------------------------------------------------------

create table agents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  name text not null,
  description text,
  system_prompt text,
  model text not null default 'claude-sonnet-4-5',
  status agent_status not null default 'active',
  configuration jsonb not null default '{}'::jsonb,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  name text not null,
  description text,
  natural_language_instruction text not null,
  status task_status not null default 'draft',
  risk_level risk_level not null default 'low',
  trigger_type trigger_type not null default 'manual',
  schedule text,
  -- full structured plan (objective, steps summary, verification, risk_level,
  -- requires_approval) as produced by the planner, per spec section 7.
  configuration jsonb not null default '{}'::jsonb,
  requires_approval boolean not null default false,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_run_at timestamptz,
  next_run_at timestamptz
);

create table task_steps (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  step_order int not null,
  name text not null,
  description text,
  step_type text not null default 'tool_call',
  tool_name text,
  configuration jsonb not null default '{}'::jsonb,
  risk_level risk_level not null default 'low',
  requires_approval boolean not null default false,
  verification_rules jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (task_id, step_order)
);

create table task_triggers (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  trigger_type trigger_type not null,
  schedule_expression text,
  timezone text not null default 'UTC',
  webhook_secret text,
  event_name text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Executions & events
-- ---------------------------------------------------------------------------

create table task_executions (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  idempotency_key text not null,
  status execution_status not null default 'DRAFT',
  trigger_source text not null default 'manual',
  started_at timestamptz,
  completed_at timestamptz,
  duration_ms int,
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  error text,
  retry_count int not null default 0,
  verification_status verification_status not null default 'pending',
  time_saved_seconds int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (task_id, idempotency_key)
);

create table execution_events (
  id uuid primary key default gen_random_uuid(),
  execution_id uuid not null references task_executions(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  event_type text not null,
  event_data jsonb not null default '{}'::jsonb,
  tool_name text,
  "timestamp" timestamptz not null default now(),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Tools & integrations
-- ---------------------------------------------------------------------------

create table tool_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  description text not null,
  category text not null,
  input_schema jsonb not null default '{}'::jsonb,
  output_schema jsonb not null default '{}'::jsonb,
  risk_level risk_level not null default 'low',
  required_permissions text[] not null default '{}',
  is_mock boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table tool_permissions (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  tool_name text not null references tool_definitions(name) on delete cascade,
  min_role org_role not null default 'member',
  is_allowed boolean not null default true,
  created_at timestamptz not null default now(),
  unique (organization_id, tool_name)
);

create table integrations (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  provider text not null,
  name text not null,
  status integration_status not null default 'disconnected',
  configuration jsonb not null default '{}'::jsonb,
  connected_by uuid references auth.users(id),
  connected_at timestamptz,
  created_at timestamptz not null default now()
);

create table integration_credentials (
  id uuid primary key default gen_random_uuid(),
  integration_id uuid not null references integrations(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  encrypted_secret text not null,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Approvals, memory, notifications, audit, schedules, templates, metrics
-- ---------------------------------------------------------------------------

create table approvals (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  execution_id uuid not null references task_executions(id) on delete cascade,
  step_id uuid references task_steps(id) on delete set null,
  action_description text not null,
  risk_level risk_level not null,
  status approval_status not null default 'pending',
  requested_by text not null default 'agent',
  decided_by uuid references auth.users(id),
  decision_reason text,
  created_at timestamptz not null default now(),
  decided_at timestamptz
);

create table memories (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  scope memory_scope not null,
  task_id uuid references tasks(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  key text not null,
  value jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  expires_at timestamptz
);

create table notifications (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  execution_id uuid references task_executions(id) on delete set null,
  type text not null,
  title text not null,
  message text not null,
  is_read boolean not null default false,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (organization_id, idempotency_key)
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  actor_id uuid references auth.users(id),
  actor_type text not null default 'user',
  action text not null,
  resource_type text,
  resource_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table schedules (
  id uuid primary key default gen_random_uuid(),
  task_id uuid not null references tasks(id) on delete cascade,
  organization_id uuid not null references organizations(id) on delete cascade,
  cron_expression text not null,
  timezone text not null default 'UTC',
  is_active boolean not null default true,
  last_triggered_at timestamptz,
  next_trigger_at timestamptz,
  created_at timestamptz not null default now()
);

create table task_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null,
  category text not null,
  icon text not null default 'sparkles',
  natural_language_instruction text not null,
  default_configuration jsonb not null default '{}'::jsonb,
  is_executable boolean not null default false,
  created_at timestamptz not null default now()
);

create table agent_metrics (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id) on delete cascade,
  agent_id uuid references agents(id) on delete set null,
  task_id uuid references tasks(id) on delete set null,
  execution_id uuid references task_executions(id) on delete set null,
  metric_type text not null,
  metric_value numeric not null,
  recorded_at timestamptz not null default now()
);

comment on table organizations is 'Tenants. Every other tenant-scoped table carries organization_id.';
comment on column organizations.settings is 'Policy engine limits: max_daily_executions, max_execution_duration_seconds, max_tool_calls_per_execution, max_retries, max_api_calls_per_execution, max_concurrent_tasks, max_ai_budget_usd_daily, approval_risk_threshold.';
comment on table task_executions is 'One row per run of a task. status follows the state machine in docs/architecture.md.';
comment on table integration_credentials is 'Secrets. RLS denies all client access — only the service role (agent-service) reads this table.';
