-- ============================================================================
-- TaskForge Row Level Security
--
-- Design:
--   * has_org_role()/is_org_member() are SECURITY DEFINER helpers so policies
--     stay one-liners instead of repeating the role hierarchy everywhere.
--   * Reads (SELECT) are granted to org members via the user's own JWT so
--     Supabase Realtime (which enforces RLS using the subscriber's JWT) only
--     ever streams a user's own organization's rows.
--   * Writes to system-of-record tables the agent-service owns (executions,
--     execution_events, memories, audit_logs, integration_credentials,
--     agent_metrics) are NOT granted to the authenticated role at all — only
--     the service role (which bypasses RLS) can write them. This is
--     deliberate: it is the enforcement that "the LLM/agent never controls
--     critical system state" via anything a browser session could spoof.
--   * Writes to user-authored resources (tasks, agents, steps, triggers,
--     schedules, integrations config, approval decisions, notification
--     read-state, org membership) are granted directly to authenticated
--     users, scoped by has_org_role(), so RLS is the real enforcement layer,
--     not just frontend filtering (spec section 20).
-- ============================================================================

-- ---------------------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------------------

create or replace function public.is_org_member(target_org_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from organization_members
    where organization_id = target_org_id
      and user_id = auth.uid()
  );
$$;

-- min_role: the caller must hold at least this role (owner > admin > manager > member > viewer)
create or replace function public.has_org_role(target_org_id uuid, min_role org_role)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from organization_members om
    where om.organization_id = target_org_id
      and om.user_id = auth.uid()
      and (
        case min_role
          when 'viewer'  then true
          when 'member'  then om.role in ('member', 'manager', 'admin', 'owner')
          when 'manager' then om.role in ('manager', 'admin', 'owner')
          when 'admin'   then om.role in ('admin', 'owner')
          when 'owner'   then om.role = 'owner'
        end
      )
  );
$$;

grant execute on function public.is_org_member(uuid) to authenticated;
grant execute on function public.has_org_role(uuid, org_role) to authenticated;

-- ---------------------------------------------------------------------------
-- organizations / organization_members / profiles
-- ---------------------------------------------------------------------------

alter table organizations enable row level security;

create policy "org members can view their organization"
  on organizations for select
  using (is_org_member(id));

create policy "org admins can update their organization"
  on organizations for update
  using (has_org_role(id, 'admin'))
  with check (has_org_role(id, 'admin'));

-- No direct INSERT policy: organizations are created exclusively via the
-- SECURITY DEFINER create_organization() RPC in 004_functions.sql, which
-- atomically creates the org and the caller's 'owner' membership row.

alter table organization_members enable row level security;

create policy "org members can view membership"
  on organization_members for select
  using (is_org_member(organization_id));

create policy "org admins can manage membership"
  on organization_members for all
  using (has_org_role(organization_id, 'admin'))
  with check (has_org_role(organization_id, 'admin'));

alter table profiles enable row level security;

create policy "users can view own profile"
  on profiles for select
  using (id = auth.uid());

create policy "users can view profiles of their org members"
  on profiles for select
  using (
    exists (
      select 1 from organization_members om1
      join organization_members om2 on om1.organization_id = om2.organization_id
      where om1.user_id = auth.uid() and om2.user_id = profiles.id
    )
  );

create policy "users can insert own profile"
  on profiles for insert
  with check (id = auth.uid());

create policy "users can update own profile"
  on profiles for update
  using (id = auth.uid())
  with check (id = auth.uid());

-- ---------------------------------------------------------------------------
-- agents
-- ---------------------------------------------------------------------------

alter table agents enable row level security;

create policy "org members can view agents"
  on agents for select using (is_org_member(organization_id));

create policy "managers+ can create agents"
  on agents for insert with check (has_org_role(organization_id, 'manager'));

create policy "managers+ can update agents"
  on agents for update
  using (has_org_role(organization_id, 'manager'))
  with check (has_org_role(organization_id, 'manager'));

create policy "admins+ can delete agents"
  on agents for delete using (has_org_role(organization_id, 'admin'));

-- ---------------------------------------------------------------------------
-- tasks / task_steps / task_triggers / schedules
-- ---------------------------------------------------------------------------

alter table tasks enable row level security;

create policy "org members can view tasks"
  on tasks for select using (is_org_member(organization_id));

create policy "members+ can create tasks"
  on tasks for insert with check (has_org_role(organization_id, 'member'));

create policy "creators and managers+ can update tasks"
  on tasks for update
  using (has_org_role(organization_id, 'manager') or (created_by = auth.uid() and has_org_role(organization_id, 'member')))
  with check (has_org_role(organization_id, 'manager') or (created_by = auth.uid() and has_org_role(organization_id, 'member')));

create policy "managers+ can delete tasks"
  on tasks for delete using (has_org_role(organization_id, 'manager'));

alter table task_steps enable row level security;

create policy "org members can view task steps"
  on task_steps for select using (
    exists (select 1 from tasks t where t.id = task_steps.task_id and is_org_member(t.organization_id))
  );

create policy "members+ can manage task steps on their tasks"
  on task_steps for all
  using (
    exists (
      select 1 from tasks t where t.id = task_steps.task_id
      and (has_org_role(t.organization_id, 'manager') or (t.created_by = auth.uid() and has_org_role(t.organization_id, 'member')))
    )
  )
  with check (
    exists (
      select 1 from tasks t where t.id = task_steps.task_id
      and (has_org_role(t.organization_id, 'manager') or (t.created_by = auth.uid() and has_org_role(t.organization_id, 'member')))
    )
  );

alter table task_triggers enable row level security;

create policy "org members can view task triggers"
  on task_triggers for select using (is_org_member(organization_id));

create policy "members+ can manage task triggers"
  on task_triggers for all
  using (has_org_role(organization_id, 'member'))
  with check (has_org_role(organization_id, 'member'));

alter table schedules enable row level security;

create policy "org members can view schedules"
  on schedules for select using (is_org_member(organization_id));

create policy "members+ can manage schedules"
  on schedules for all
  using (has_org_role(organization_id, 'member'))
  with check (has_org_role(organization_id, 'member'));

-- ---------------------------------------------------------------------------
-- task_executions / execution_events  (agent-service / service-role writes only)
-- ---------------------------------------------------------------------------

alter table task_executions enable row level security;

create policy "org members can view executions"
  on task_executions for select using (is_org_member(organization_id));

-- No insert/update/delete policy for `authenticated`: only the service role
-- (agent-service) writes executions, so browsers can never fabricate or
-- alter execution state directly, even if they hold a valid session.

alter table execution_events enable row level security;

create policy "org members can view execution events"
  on execution_events for select using (is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- tool_definitions / tool_permissions / integrations / integration_credentials
-- ---------------------------------------------------------------------------

alter table tool_definitions enable row level security;

create policy "authenticated users can view the tool catalog"
  on tool_definitions for select
  using (auth.role() = 'authenticated');

-- tool_definitions is a shared catalog seeded by migrations; no client writes.

alter table tool_permissions enable row level security;

create policy "org members can view tool permissions"
  on tool_permissions for select using (is_org_member(organization_id));

create policy "admins+ can manage tool permissions"
  on tool_permissions for all
  using (has_org_role(organization_id, 'admin'))
  with check (has_org_role(organization_id, 'admin'));

alter table integrations enable row level security;

create policy "org members can view integrations"
  on integrations for select using (is_org_member(organization_id));

create policy "admins+ can manage integrations"
  on integrations for all
  using (has_org_role(organization_id, 'admin'))
  with check (has_org_role(organization_id, 'admin'));

-- integration_credentials: RLS enabled, ZERO policies for authenticated/anon.
-- Only the service role (which bypasses RLS) can read or write this table.
alter table integration_credentials enable row level security;

-- ---------------------------------------------------------------------------
-- approvals
-- ---------------------------------------------------------------------------

alter table approvals enable row level security;

create policy "org members can view approvals"
  on approvals for select using (is_org_member(organization_id));

create policy "managers+ can decide approvals"
  on approvals for update
  using (has_org_role(organization_id, 'manager'))
  with check (has_org_role(organization_id, 'manager'));

-- No insert policy for `authenticated`: approvals are raised by the
-- agent-service (service role) when a step's risk crosses the org threshold.

-- ---------------------------------------------------------------------------
-- memories / notifications / audit_logs / agent_metrics
-- ---------------------------------------------------------------------------

alter table memories enable row level security;

create policy "org members can view memories"
  on memories for select using (is_org_member(organization_id));

-- Writes come exclusively from the agent-service (service role); memory
-- must never be editable from the browser, per spec section 24.

alter table notifications enable row level security;

create policy "org members can view their notifications"
  on notifications for select
  using (is_org_member(organization_id) and (user_id is null or user_id = auth.uid()));

create policy "users can mark their own notifications read"
  on notifications for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table audit_logs enable row level security;

create policy "org members can view audit logs"
  on audit_logs for select using (is_org_member(organization_id));

-- Audit logs are append-only and written exclusively via the service role
-- (both Next.js server routes and the agent-service), never by end users
-- directly, so the trail cannot be edited after the fact.

alter table agent_metrics enable row level security;

create policy "org members can view agent metrics"
  on agent_metrics for select using (is_org_member(organization_id));

-- ---------------------------------------------------------------------------
-- task_templates: public shared catalog (readable even signed-out, for the
-- landing page's "use template" preview)
-- ---------------------------------------------------------------------------

alter table task_templates enable row level security;

create policy "anyone can view task templates"
  on task_templates for select using (true);
