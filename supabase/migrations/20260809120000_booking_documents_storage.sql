-- Storage bucket + RLS for the (already-built) booking documents feature.
-- Uploads use path: {auth.uid}/{booking_id}/{timestamp}_{filename}
-- so access is scoped to each user's own top-level folder.

-- 1. Private bucket (20MB max per file).
insert into storage.buckets (id, name, public, file_size_limit)
values ('booking-documents', 'booking-documents', false, 20971520)
on conflict (id) do nothing;

-- 2. RLS policies on storage.objects for this bucket, scoped to the owner's folder.
drop policy if exists "booking-docs read own" on storage.objects;
create policy "booking-docs read own" on storage.objects
  for select to authenticated
  using (bucket_id = 'booking-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "booking-docs insert own" on storage.objects;
create policy "booking-docs insert own" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'booking-documents' and (storage.foldername(name))[1] = auth.uid()::text);

drop policy if exists "booking-docs delete own" on storage.objects;
create policy "booking-docs delete own" on storage.objects
  for delete to authenticated
  using (bucket_id = 'booking-documents' and (storage.foldername(name))[1] = auth.uid()::text);
