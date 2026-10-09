-- Storage buckets and policies for Scribe
-- Run this in Supabase SQL Editor after base schema
-- Buckets must be created via Supabase Dashboard or API first:
-- 1. Go to Storage → Create bucket: "exam-pages" (private)
-- 2. Go to Storage → Create bucket: "logos" (private)
-- Then run these policies:

-- ============================================================
-- exam-pages bucket policies
-- ============================================================

-- Teachers can upload/read their own exam pages
create policy "exam_pages_teacher_upload" on storage.objects
  for insert with check (
    bucket_id = 'exam-pages'
    and exists (
      select 1 from public.exams
      where id = (storage.foldername(name))[1]::uuid
        and teacher_id = auth.uid()
    )
  );

create policy "exam_pages_teacher_read" on storage.objects
  for select using (
    bucket_id = 'exam-pages'
    and exists (
      select 1 from public.exams
      where id = (storage.foldername(name))[1]::uuid
        and teacher_id = auth.uid()
    )
  );

create policy "exam_pages_teacher_delete" on storage.objects
  for delete using (
    bucket_id = 'exam-pages'
    and exists (
      select 1 from public.exams
      where id = (storage.foldername(name))[1]::uuid
        and teacher_id = auth.uid()
    )
  );

-- Admins can read all exam pages in their organisation
create policy "exam_pages_admin_read" on storage.objects
  for select using (
    bucket_id = 'exam-pages'
    and exists (
      select 1 from public.exams e
      join public.profiles p on p.organisation_id = e.organisation_id
      where e.id = (storage.foldername(name))[1]::uuid
        and p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- ============================================================
-- logos bucket policies
-- ============================================================

-- Admins can manage their organisation's logos
create policy "logos_admin_all" on storage.objects
  for all using (
    bucket_id = 'logos'
    and exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id::text = (storage.foldername(name))[1]
        and role = 'admin'
    )
  );