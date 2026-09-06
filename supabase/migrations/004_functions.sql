-- ============================================================================
-- TaskForge functions & triggers
-- ============================================================================

-- ---------------------------------------------------------------------------
-- updated_at maintenance
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_organizations_updated_at before update on organizations
  for each row execute function public.set_updated_at();
create trigger trg_agents_updated_at before update on agents
  for each row execute function public.set_updated_at();
create trigger trg_tasks_updated_at before update on tasks
  for each row execute function public.set_updated_at();
create trigger trg_task_executions_updated_at before update on task_executions
  for each row execute function public.set_updated_at();
create trigger trg_memories_updated_at before update on memories
  for each row execute function public.set_updated_at();
create trigger trg_profiles_updated_at before update on profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Auto-create a profile row when a new auth user signs up.
-- ---------------------------------------------------------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, coalesce(new.raw_user_meta_data ->> 'full_name', new.email))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- create_organization: atomic org + owner-membership creation.
-- This is the ONLY way organizations get created (no direct INSERT policy
-- on the organizations table) so every org always has exactly one owner
-- from the moment it exists.
-- ---------------------------------------------------------------------------

create or replace function public.create_organization(org_name text, org_slug text)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_org_id uuid;
begin
  if auth.uid() is null then
    raise exception 'authentication required';
  end if;

  if org_name is null or length(trim(org_name)) = 0 then
    raise exception 'organization name is required';
  end if;

  insert into organizations (name, slug)
  values (trim(org_name), org_slug)
  returning id into v_org_id;

  insert into organization_members (organization_id, user_id, role)
  values (v_org_id, auth.uid(), 'owner');

  -- Every organization starts with the mock integrations connected, so the
  -- full pipeline is runnable immediately without any external setup.
  insert into integrations (organization_id, provider, name, status, connected_by, connected_at)
  values
    (v_org_id, 'mock_email', 'Email (Mock)', 'connected', auth.uid(), now()),
    (v_org_id, 'mock_crm', 'CRM (Mock)', 'connected', auth.uid(), now()),
    (v_org_id, 'mock_spreadsheet', 'Spreadsheets (Mock)', 'connected', auth.uid(), now()),
    (v_org_id, 'mock_database', 'Database (Mock)', 'connected', auth.uid(), now()),
    (v_org_id, 'http', 'HTTP / Webhooks', 'connected', auth.uid(), now()),
    (v_org_id, 'mock_notification', 'Notifications (Mock)', 'connected', auth.uid(), now()),
    (v_org_id, 'google_workspace', 'Google Workspace', 'disconnected', null, null),
    (v_org_id, 'microsoft_365', 'Microsoft 365', 'disconnected', null, null),
    (v_org_id, 'slack_webhook', 'Slack', 'disconnected', null, null);

  insert into audit_logs (organization_id, actor_id, actor_type, action, resource_type, resource_id)
  values (v_org_id, auth.uid(), 'user', 'organization.created', 'organization', v_org_id);

  return v_org_id;
end;
$$;

revoke all on function public.create_organization(text, text) from public;
grant execute on function public.create_organization(text, text) to authenticated;

-- ---------------------------------------------------------------------------
-- claim_due_tasks: the scheduler's queue-claim primitive.
--
-- Called only by the Python worker (service role). Locks each due, active,
-- schedule-triggered task with FOR UPDATE SKIP LOCKED so two concurrent
-- worker processes never race on the same task, then creates a QUEUED
-- execution row keyed by a per-minute idempotency key so the same schedule
-- tick can never produce two executions even under retries.
-- ---------------------------------------------------------------------------

create or replace function public.claim_due_tasks(p_limit int default 10)
returns table (execution_id uuid, task_id uuid, organization_id uuid)
language plpgsql
security definer
set search_path = public
as $$
declare
  r record;
  v_idem text;
  v_exec_id uuid;
begin
  for r in
    select t.id, t.organization_id
    from tasks t
    where t.status = 'active'
      and t.trigger_type = 'schedule'
      and t.next_run_at is not null
      and t.next_run_at <= now()
    order by t.next_run_at
    limit p_limit
    for update skip locked
  loop
    v_idem := 'sched-' || to_char(date_trunc('minute', now() at time zone 'utc'), 'YYYYMMDDHH24MI');
    v_exec_id := null;

    insert into task_executions (task_id, organization_id, idempotency_key, status, trigger_source, input_data)
    values (r.id, r.organization_id, v_idem, 'QUEUED', 'schedule', '{}'::jsonb)
    on conflict (task_id, idempotency_key) do nothing
    returning id into v_exec_id;

    if v_exec_id is not null then
      update tasks set last_run_at = now() where id = r.id;
      execution_id := v_exec_id;
      task_id := r.id;
      organization_id := r.organization_id;
      return next;
    end if;
  end loop;
end;
$$;

revoke all on function public.claim_due_tasks(int) from public;
grant execute on function public.claim_due_tasks(int) to service_role;

-- ---------------------------------------------------------------------------
-- record_time_saved: convenience used by the reporting engine to append a
-- time-saved metric row alongside updating the execution's own counter.
-- ---------------------------------------------------------------------------

create or replace function public.record_time_saved(
  p_organization_id uuid,
  p_task_id uuid,
  p_execution_id uuid,
  p_seconds int
)
returns void
language sql
security definer
set search_path = public
as $$
  insert into agent_metrics (organization_id, task_id, execution_id, metric_type, metric_value)
  values (p_organization_id, p_task_id, p_execution_id, 'time_saved_seconds', p_seconds);
$$;

revoke all on function public.record_time_saved(uuid, uuid, uuid, int) from public;
grant execute on function public.record_time_saved(uuid, uuid, uuid, int) to service_role;
