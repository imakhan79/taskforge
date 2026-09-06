-- ============================================================================
-- Manual RLS verification (spec section 20).
--
-- Run this in the Supabase SQL editor (or `psql`) AFTER applying all
-- migrations. It creates two organizations with one user each, then uses
-- `set_config('request.jwt.claims', ...)` to impersonate each user and
-- confirm cross-tenant access is blocked. Clean up at the end — this is a
-- manual verification script, not a migration.
--
-- Expected results are annotated inline with `-- EXPECT:`.
-- ============================================================================

begin;

-- Two fake auth users (normally created via Supabase Auth signup).
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-0000000000a1', 'org-a-owner@example.com'),
  ('00000000-0000-0000-0000-0000000000b1', 'org-b-owner@example.com')
on conflict (id) do nothing;

insert into organizations (id, name, slug) values
  ('00000000-0000-0000-0000-00000000aaaa', 'Org A', 'org-a-rls-test'),
  ('00000000-0000-0000-0000-00000000bbbb', 'Org B', 'org-b-rls-test')
on conflict (id) do nothing;

insert into organization_members (organization_id, user_id, role) values
  ('00000000-0000-0000-0000-00000000aaaa', '00000000-0000-0000-0000-0000000000a1', 'owner'),
  ('00000000-0000-0000-0000-00000000bbbb', '00000000-0000-0000-0000-0000000000b1', 'owner')
on conflict do nothing;

insert into tasks (id, organization_id, name, natural_language_instruction, created_by) values
  ('00000000-0000-0000-0000-0000000ta5ka', '00000000-0000-0000-0000-00000000aaaa', 'Org A Task', 'Do something for org A', '00000000-0000-0000-0000-0000000000a1');

-- ---------------------------------------------------------------------------
-- Impersonate Org A's owner
-- ---------------------------------------------------------------------------
set local role authenticated;
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000a1', 'role', 'authenticated')::text, true);

select count(*) as should_be_1 from tasks; -- EXPECT: 1 (their own org's task)
select count(*) as should_be_0 from tasks where organization_id = '00000000-0000-0000-0000-00000000bbbb'; -- EXPECT: 0

-- Attempt to read Org B directly by id — must be blocked by RLS, not by the WHERE clause.
select count(*) as should_be_0_too from organizations where id = '00000000-0000-0000-0000-00000000bbbb'; -- EXPECT: 0

-- Attempt to insert a task into Org B — must fail (0 rows affected / policy violation).
-- Uncomment to see the RLS rejection:
-- insert into tasks (organization_id, name, natural_language_instruction, created_by)
-- values ('00000000-0000-0000-0000-00000000bbbb', 'hijack attempt', 'nope', '00000000-0000-0000-0000-0000000000a1');
-- EXPECT: ERROR - new row violates row-level security policy

-- ---------------------------------------------------------------------------
-- Impersonate Org B's owner — must see none of Org A's data
-- ---------------------------------------------------------------------------
select set_config('request.jwt.claims', json_build_object('sub', '00000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, true);
select count(*) as should_be_0 from tasks; -- EXPECT: 0 (Org B has no tasks, and cannot see Org A's)

reset role;

rollback; -- discard all test data, nothing persists
