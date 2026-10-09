-- Base schema for Scribe
-- Run this first, then 20260927001_save_exam_atomic.sql

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- Organisations
-- ============================================================
create table public.organisations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_email text,
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_organisations_created_by on public.organisations(created_by);

-- ============================================================
-- Profiles (extends auth.users)
-- ============================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  organisation_id uuid references public.organisations(id) on delete set null,
  role text not null check (role in ('admin', 'teacher')) default 'teacher',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_profiles_organisation_id on public.profiles(organisation_id);
create index idx_profiles_email on public.profiles(email);

-- ============================================================
-- Invitations
-- ============================================================
create table public.invitations (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  email text not null,
  role text not null check (role = 'teacher') default 'teacher',
  status text not null check (status in ('pending', 'accepted', 'revoked')) default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (organisation_id, email, status)
);

create index idx_invitations_organisation_id on public.invitations(organisation_id);
create index idx_invitations_email on public.invitations(email);

-- ============================================================
-- Templates (one per organisation)
-- ============================================================
create table public.templates (
  organisation_id uuid primary key references public.organisations(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Exams
-- ============================================================
create table public.exams (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references public.organisations(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title_block jsonb not null default '{}'::jsonb,
  status text not null check (status in ('draft', 'finalized')) default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_exams_organisation_id on public.exams(organisation_id);
create index idx_exams_teacher_id on public.exams(teacher_id);
create index idx_exams_status on public.exams(status);
create index idx_exams_created_at on public.exams(created_at desc);

-- ============================================================
-- Exam Pages (stored in Supabase Storage, metadata here)
-- ============================================================
create table public.exam_pages (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  page_number int not null,
  storage_path text not null,
  created_at timestamptz not null default now(),
  unique (exam_id, page_number)
);

create index idx_exam_pages_exam_id on public.exam_pages(exam_id);

-- ============================================================
-- Questions
-- ============================================================
create table public.questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references public.exams(id) on delete cascade,
  text text not null,
  marks int,
  options text[] not null default '{}',
  "order" int not null,
  page_number int,
  created_at timestamptz not null default now()
);

create index idx_questions_exam_id on public.questions(exam_id);
create index idx_questions_exam_order on public.questions(exam_id, "order");

-- ============================================================
-- Row Level Security
-- ============================================================

-- Organisations: admins can read their org, creators can read their own
alter table public.organisations enable row level security;

create policy "org_admin_read" on public.organisations
  for select using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id = organisations.id
        and role = 'admin'
    )
  );

create policy "org_creator_read" on public.organisations
  for select using (created_by = auth.uid());

create policy "org_admin_update" on public.organisations
  for update using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id = organisations.id
        and role = 'admin'
    )
  );

-- Profiles: users can read/update their own; admins can read all in their org
alter table public.profiles enable row level security;

create policy "profile_self_read" on public.profiles
  for select using (id = auth.uid());

create policy "profile_admin_read" on public.profiles
  for select using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.organisation_id = profiles.organisation_id
        and p.role = 'admin'
    )
  );

create policy "profile_self_update" on public.profiles
  for update using (id = auth.uid());

create policy "profile_admin_update_role" on public.profiles
  for update using (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.organisation_id = profiles.organisation_id
        and p.role = 'admin'
    )
  ) with check (
    exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.organisation_id = profiles.organisation_id
        and p.role = 'admin'
    )
  );

-- Invitations: admins can manage; invited users can read their own pending invite
alter table public.invitations enable row level security;

create policy "invitation_admin_all" on public.invitations
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id = invitations.organisation_id
        and role = 'admin'
    )
  );

create policy "invitation_invitee_read" on public.invitations
  for select using (
    email = (select email from auth.users where id = auth.uid())
    and status = 'pending'
  );

-- Templates: admins can manage their org's template
alter table public.templates enable row level security;

create policy "template_admin_all" on public.templates
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id = templates.organisation_id
        and role = 'admin'
    )
  );

-- Exams: teachers own their exams; admins see all in org
alter table public.exams enable row level security;

create policy "exam_teacher_all" on public.exams
  for all using (teacher_id = auth.uid());

create policy "exam_admin_all" on public.exams
  for all using (
    exists (
      select 1 from public.profiles
      where id = auth.uid()
        and organisation_id = exams.organisation_id
        and role = 'admin'
    )
  );

-- Exam Pages: follow exam permissions
alter table public.exam_pages enable row level security;

create policy "exampage_teacher_all" on public.exam_pages
  for all using (
    exists (
      select 1 from public.exams
      where id = exam_pages.exam_id
        and teacher_id = auth.uid()
    )
  );

create policy "exampage_admin_all" on public.exam_pages
  for all using (
    exists (
      select 1 from public.exams e
      join public.profiles p on p.organisation_id = e.organisation_id
      where e.id = exam_pages.exam_id
        and p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- Questions: follow exam permissions
alter table public.questions enable row level security;

create policy "question_teacher_all" on public.questions
  for all using (
    exists (
      select 1 from public.exams
      where id = questions.exam_id
        and teacher_id = auth.uid()
    )
  );

create policy "question_admin_all" on public.questions
  for all using (
    exists (
      select 1 from public.exams e
      join public.profiles p on p.organisation_id = e.organisation_id
      where e.id = questions.exam_id
        and p.id = auth.uid()
        and p.role = 'admin'
    )
  );

-- ============================================================
-- Updated At Triggers
-- ============================================================
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger organisations_updated_at
  before update on public.organisations
  for each row execute function public.handle_updated_at();

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.handle_updated_at();

create trigger templates_updated_at
  before update on public.templates
  for each row execute function public.handle_updated_at();

create trigger exams_updated_at
  before update on public.exams
  for each row execute function public.handle_updated_at();

-- ============================================================
-- Auto-create profile on user signup
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name', 'teacher')
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- Storage Buckets (created via SQL for reproducibility)
-- Note: Bucket creation via SQL requires Supabase dashboard or API
-- These are here for documentation; run in Supabase SQL Editor if needed
-- ============================================================

-- insert into storage.buckets (id, name, public) values ('exam-pages', 'exam-pages', false);
-- insert into storage.buckets (id, name, public) values ('logos', 'logos', false);

-- Storage policies for exam-pages (teacher owns, admin org access)
-- create policy "exam_pages_teacher_access" on storage.objects
--   for all using (
--     bucket_id = 'exam-pages'
--     and exists (
--       select 1 from public.exam_pages ep
--       join public.exams e on e.id = ep.exam_id
--       where ep.storage_path = storage.objects.name
--         and e.teacher_id = auth.uid()
--     )
--   );

-- create policy "exam_pages_admin_access" on storage.objects
--   for all using (
--     bucket_id = 'exam-pages'
--     and exists (
--       select 1 from public.exam_pages ep
--       join public.exams e on e.id = ep.exam_id
--       join public.profiles p on p.organisation_id = e.organisation_id
--       where ep.storage_path = storage.objects.name
--         and p.id = auth.uid()
--         and p.role = 'admin'
--     )
--   );

-- Storage policies for logos (admin manages)
-- create policy "logos_admin_all" on storage.objects
--   for all using (
--     bucket_id = 'logos'
--     and exists (
--       select 1 from public.templates t
--       join public.profiles p on p.organisation_id = t.organisation_id
--       where t.organisation_id::text = (storage.foldername(storage.objects.name))[1]
--         and p.id = auth.uid()
--         and p.role = 'admin'
--     )
--   );