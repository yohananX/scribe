-- Scribe Database Schema
-- Run this in the Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- Organisations
create table organisations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_email text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Invitations
create table invitations (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  email text not null,
  role text not null default 'teacher' check (role in ('teacher')),
  status text not null default 'pending' check (status in ('pending', 'accepted', 'revoked')),
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- Only one pending invitation per email per organisation
create unique index invitations_org_email_pending on invitations (organisation_id, email) where status = 'pending';

-- Profiles (extends auth.users)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text,
  organisation_id uuid references organisations(id) on delete set null,
  role text not null default 'teacher' check (role in ('admin', 'teacher')),
  created_at timestamptz not null default now()
);

-- Automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email);
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Templates
create table templates (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  config jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One template per organisation
create unique index templates_org_unique on templates (organisation_id);

-- Exams
create table exams (
  id uuid primary key default uuid_generate_v4(),
  organisation_id uuid not null references organisations(id) on delete cascade,
  teacher_id uuid not null references auth.users(id) on delete cascade,
  title_block jsonb not null default '{}',
  status text not null default 'draft' check (status in ('draft', 'finalized')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Exam Pages (uploaded photos)
create table exam_pages (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  page_number int not null,
  storage_path text not null,
  created_at timestamptz not null default now()
);

-- Questions
create table questions (
  id uuid primary key default uuid_generate_v4(),
  exam_id uuid not null references exams(id) on delete cascade,
  text text not null,
  marks int,
  options jsonb default '[]',
  "order" int not null,
  page_number int,
  created_at timestamptz not null default now()
);

-- Helper lookups that bypass RLS (security definer) so policies on
-- profiles never query profiles directly (that caused infinite recursion).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create or replace function private.current_user_organisation_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organisation_id
  from public.profiles
  where id = (select auth.uid());
$$;

create or replace function private.is_current_user_org_admin(target_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = (select auth.uid())
      and organisation_id = target_organisation_id
      and role = 'admin'
  );
$$;

create or replace function private.is_current_user_org_creator(target_organisation_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organisations
    where id = target_organisation_id
      and created_by = (select auth.uid())
  );
$$;

revoke all on function private.current_user_organisation_id() from public;
revoke all on function private.is_current_user_org_admin(uuid) from public;
revoke all on function private.is_current_user_org_creator(uuid) from public;
grant execute on function private.current_user_organisation_id() to authenticated;
grant execute on function private.is_current_user_org_admin(uuid) to authenticated;
grant execute on function private.is_current_user_org_creator(uuid) to authenticated;

-- RLS Policies

alter table organisations enable row level security;
alter table profiles enable row level security;
alter table templates enable row level security;
alter table exams enable row level security;
alter table exam_pages enable row level security;
alter table questions enable row level security;
alter table invitations enable row level security;

-- Any signed-in user can create an organisation (they become the first admin)
create policy "Users can create their own organisation"
on organisations for insert to authenticated
with check (created_by = (select auth.uid()));

create policy "Users view their own org" on organisations for select using (
  id in (select organisation_id from profiles where id = auth.uid())
);

create policy "Admins update org" on organisations for update using (
  id in (select organisation_id from profiles where id = auth.uid() and role = 'admin')
);

-- Profiles: a user can create their own row; reads and updates go through
-- the non-recursive helpers above.
create policy "Users create their own profile" on profiles for insert with check (
  id = auth.uid()
);

create policy "Users view their own profile or organisation members"
on public.profiles for select to authenticated
using (
  id = (select auth.uid())
  or organisation_id = (select private.current_user_organisation_id())
);

create policy "Admins update organisation profiles"
on public.profiles for update to authenticated
using ((select private.is_current_user_org_admin(organisation_id)))
with check (
  organisation_id is null
  or (select private.is_current_user_org_admin(organisation_id))
);

create policy "Users create their organisation"
on public.profiles for update to authenticated
using (id = (select auth.uid()) and organisation_id is null)
with check (
  id = (select auth.uid())
  and role = 'admin'
  and (select private.is_current_user_org_creator(organisation_id))
);

-- A newly authenticated teacher may join only through a pending invitation
-- addressed to the same authenticated email address.
create policy "Users join through their own pending invitation"
on public.profiles for update to authenticated
using (id = (select auth.uid()) and organisation_id is null)
with check (
  id = (select auth.uid())
  and role = 'teacher'
  and exists (
    select 1
    from public.invitations
    where invitations.status = 'pending'
      and invitations.organisation_id = profiles.organisation_id
      and invitations.email = (
        select email from auth.users where id = (select auth.uid())
      )
  )
);

-- Invitations: org admins manage; the invited user can see only their own
create policy "Admins manage invitations" on invitations for all using (
  organisation_id in (select organisation_id from profiles where id = auth.uid() and role = 'admin')
);

create policy "Users view their own invitation" on invitations for select using (
  email = (select email from auth.users where id = auth.uid())
);

-- The invited teacher marks their own invitation accepted when they join.
create policy "Invitees accept their own invitation"
on public.invitations for update to authenticated
using (
  status = 'pending'
  and email = (select email from auth.users where id = (select auth.uid()))
)
with check (
  status = 'accepted'
  and email = (select email from auth.users where id = (select auth.uid()))
);

create policy "Users view org template" on templates for select using (
  organisation_id in (select organisation_id from profiles where id = auth.uid())
);

create policy "Admins manage template" on templates for all using (
  organisation_id in (select organisation_id from profiles where id = auth.uid() and role = 'admin')
);

create policy "Teachers manage own exams" on exams for all using (
  teacher_id = auth.uid() or organisation_id in (
    select organisation_id from profiles where id = auth.uid() and role = 'admin'
  )
);

create policy "Users view org exams" on exams for select using (
  organisation_id in (select organisation_id from profiles where id = auth.uid())
);

create policy "Users view exam pages" on exam_pages for select using (
  exam_id in (
    select id from exams where organisation_id in (
      select organisation_id from profiles where id = auth.uid()
    )
  )
);

create policy "Teachers manage own exam pages" on exam_pages for all using (
  exam_id in (
    select id from exams where teacher_id = auth.uid()
  )
);

create policy "Users view org questions" on questions for select using (
  exam_id in (
    select id from exams where organisation_id in (
      select organisation_id from profiles where id = auth.uid()
    )
  )
);

create policy "Teachers manage own questions" on questions for all using (
  exam_id in (
    select id from exams where teacher_id = auth.uid()
  )
);

-- Private storage buckets for logos and exam pages (created below).
-- Files are served to the editor/preview views via short-lived signed URLs.

-- Storage buckets
insert into storage.buckets (id, name, public)
values ('logos', 'logos', false), ('exam-pages', 'exam-pages', false)
on conflict (id) do nothing;

-- Resolve the exam id from a storage path like "<examId>/<page>/<file>"
create or replace function public.exam_id_from_storage_path(p_path text)
returns uuid
language sql
stable
as $$
  select (storage.foldername(p_path))[1]::uuid;
$$;

-- Any teacher can upload pages to their own exam
create policy "Teachers upload pages to their own exams"
on storage.objects for insert with check (
  bucket_id = 'exam-pages'
  and exists (
    select 1 from exams
    where exams.id = public.exam_id_from_storage_path(name)
      and exams.teacher_id = auth.uid()
  )
);

-- Exam owners and org admins may replace or remove page files
-- (used by upload retries and failed-creation cleanup).
create policy "Owners and admins manage exam page files"
on storage.objects for update using (
  bucket_id = 'exam-pages'
  and exists (
    select 1 from exams
    where exams.id = public.exam_id_from_storage_path(name)
      and (
        exams.teacher_id = auth.uid()
        or private.is_current_user_org_admin(exams.organisation_id)
      )
  )
);

create policy "Owners and admins remove exam page files"
on storage.objects for delete using (
  bucket_id = 'exam-pages'
  and exists (
    select 1 from exams
    where exams.id = public.exam_id_from_storage_path(name)
      and (
        exams.teacher_id = auth.uid()
        or private.is_current_user_org_admin(exams.organisation_id)
      )
  )
);

-- Logo files live under "<organisation_id>/...". Only an admin of that
-- organisation may upload, replace or remove them.
create policy "Admins manage organisation logos"
on storage.objects for all using (
  bucket_id = 'logos'
  and private.is_current_user_org_admin((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'logos'
  and private.is_current_user_org_admin((storage.foldername(name))[1]::uuid)
);

-- Exam owners and admins can read exam pages; any member can read logos
create policy "Users read exam pages and logos"
on storage.objects for select using (
  (
    bucket_id = 'exam-pages'
    and exists (
      select 1 from exams
      where exams.id = public.exam_id_from_storage_path(name)
        and (
          exams.teacher_id = auth.uid()
          or exams.organisation_id in (
            select organisation_id from profiles where id = auth.uid() and role = 'admin'
          )
        )
    )
  )
  or (
    bucket_id = 'logos'
    and exists (
      select 1 from profiles where id = auth.uid() and organisation_id is not null
    )
  )
);
