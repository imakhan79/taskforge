-- ============================================================================
-- Enable Supabase Realtime (spec section 23) on the tables the dashboard
-- watches live: execution status, the event timeline, approvals, and
-- notifications. RLS still applies to realtime delivery — a subscriber only
-- receives change events for rows their own JWT can SELECT.
-- ============================================================================

alter publication supabase_realtime add table task_executions;
alter publication supabase_realtime add table execution_events;
alter publication supabase_realtime add table approvals;
alter publication supabase_realtime add table notifications;
