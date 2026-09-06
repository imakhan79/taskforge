-- ============================================================================
-- TaskForge storage buckets (spec section 22).
--
-- All buckets are private. Objects are stored under a
-- "{organization_id}/..." path prefix and RLS reads the first path segment
-- to authorize access, so a signed URL or direct object path can never leak
-- another organization's file even if guessed.
-- ============================================================================

insert into storage.buckets (id, name, public, file_size_limit)
values
  ('documents', 'documents', false, 52428800),
  ('attachments', 'attachments', false, 52428800),
  ('reports', 'reports', false, 52428800),
  ('artifacts', 'artifacts', false, 52428800)
on conflict (id) do nothing;

create policy "org members can read their org's storage objects"
  on storage.objects for select
  using (
    bucket_id in ('documents', 'attachments', 'reports', 'artifacts')
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "org members can upload to their org's storage objects"
  on storage.objects for insert
  with check (
    bucket_id in ('documents', 'attachments', 'reports', 'artifacts')
    and is_org_member((storage.foldername(name))[1]::uuid)
  );

create policy "admins+ can delete their org's storage objects"
  on storage.objects for delete
  using (
    bucket_id in ('documents', 'attachments', 'reports', 'artifacts')
    and has_org_role((storage.foldername(name))[1]::uuid, 'admin')
  );
