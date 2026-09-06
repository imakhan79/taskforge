-- ============================================================================
-- TaskForge indexes
-- Postgres does not auto-index foreign keys; every FK used in a join or RLS
-- policy subquery gets one, plus indexes for the query patterns the
-- dashboard and worker actually run (status polling, realtime feeds, time
-- range queries).
-- ============================================================================

-- organization_members: looked up on every RLS check via is_org_member/has_org_role
create index idx_org_members_user on organization_members(user_id);
create index idx_org_members_org on organization_members(organization_id);

-- agents
create index idx_agents_org on agents(organization_id);

-- tasks: dashboard list, scheduler due-task scan
create index idx_tasks_org on tasks(organization_id);
create index idx_tasks_org_status on tasks(organization_id, status);
create index idx_tasks_next_run on tasks(next_run_at) where status = 'active';
create index idx_tasks_created_by on tasks(created_by);

-- task_steps
create index idx_task_steps_task on task_steps(task_id, step_order);

-- task_triggers
create index idx_task_triggers_task on task_triggers(task_id);
create index idx_task_triggers_org on task_triggers(organization_id);
create index idx_task_triggers_active on task_triggers(is_active) where is_active = true;

-- task_executions: execution list/detail, realtime, worker queue claim
create index idx_executions_org on task_executions(organization_id);
create index idx_executions_task on task_executions(task_id, created_at desc);
create index idx_executions_status on task_executions(status);
create index idx_executions_org_created on task_executions(organization_id, created_at desc);

-- execution_events: execution timeline (ordered), realtime feed
create index idx_execution_events_execution on execution_events(execution_id, "timestamp");
create index idx_execution_events_org on execution_events(organization_id);

-- tool_permissions / integrations
create index idx_tool_permissions_org on tool_permissions(organization_id);
create index idx_integrations_org on integrations(organization_id);
create index idx_integration_credentials_integration on integration_credentials(integration_id);
create index idx_integration_credentials_org on integration_credentials(organization_id);

-- approvals: approvals inbox, execution detail
create index idx_approvals_org_status on approvals(organization_id, status);
create index idx_approvals_execution on approvals(execution_id);

-- memories: memory manager lookups by scope/task/user + key
create index idx_memories_org_scope on memories(organization_id, scope);
create index idx_memories_task on memories(task_id) where task_id is not null;
create index idx_memories_user on memories(user_id) where user_id is not null;
create unique index idx_memories_scope_key on memories(organization_id, scope, coalesce(task_id, '00000000-0000-0000-0000-000000000000'), coalesce(user_id, '00000000-0000-0000-0000-000000000000'), key);
create index idx_memories_expires on memories(expires_at) where expires_at is not null;

-- notifications: unread inbox
create index idx_notifications_org_user on notifications(organization_id, user_id);
create index idx_notifications_unread on notifications(organization_id, is_read) where is_read = false;

-- audit_logs: audit log page, filtered by org + time range
create index idx_audit_logs_org_created on audit_logs(organization_id, created_at desc);
create index idx_audit_logs_actor on audit_logs(actor_id);
create index idx_audit_logs_resource on audit_logs(resource_type, resource_id);

-- schedules: scheduler due-schedule scan
create index idx_schedules_org on schedules(organization_id);
create index idx_schedules_next_trigger on schedules(next_trigger_at) where is_active = true;

-- agent_metrics: analytics aggregation
create index idx_agent_metrics_org_type_time on agent_metrics(organization_id, metric_type, recorded_at desc);
create index idx_agent_metrics_task on agent_metrics(task_id) where task_id is not null;
create index idx_agent_metrics_execution on agent_metrics(execution_id) where execution_id is not null;

-- tool_definitions: category filter on the Tools page
create index idx_tool_definitions_category on tool_definitions(category);
