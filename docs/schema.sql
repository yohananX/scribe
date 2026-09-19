-- Scribe Database Schema
-- Run this in the Supabase SQL Editor.

create extension if not exists "uuid-ossp";

-- Organisations
create table organisations (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  contact_email text,
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
  order int not null,
  page_number int,
  created_at timestamptz not null default now()
);

-- RLS Policies

alter table organisations enable row level security;
alter table profiles enable row level security;
alter table templates enable row level security;
alter table exams enable row level security;
alter table exam_pages enable row level security;
alter table questions enable row level security;
alter table invitations enable row level security;

-- Any signed-in user can create an organisation (they become the first admin)
create policy "Users can create an organisation" on organisations for insert with check (
  auth.uid() is not null
);

create policy "Users view their own org" on organisations for select using (
  id in (select organisation_id from profiles where id = auth.uid())
);

create policy "Admins update org" on organisations for update using (
  id in (select organisation_id from profiles where id = auth.uid() and role = 'admin')
);

-- Profiles: a user can create and update their own row
create policy "Users create their own profile" on profiles for insert with check (
  id = auth.uid()
);

create policy "Users update their own profile" on profiles for update using (
  id = auth.uid()
) with check (
  id = auth.uid()
);

create policy "Users view profiles in org" on profiles for select using (
  organisation_id in (select organisation_id from profiles where id = auth.uid())
);

create policy "Admins manage profiles" on profiles for all using (
  organisation_id in (select organisation_id from profiles where id = auth.uid() and role = 'admin')
);

-- Invitations: org admins manage; the invited user can see only their own
create policy "Admins manage invitations" on invitations for all using (
  organisation_id in (select organisation_id from profiles where id = auth.uid() and role = 'admin')
);

create policy "Users view their own invitation" on invitations for select using (
  email = (select email from auth.users where id = auth.uid())
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

-- Public storage buckets for logos and exam pages can be created in Supabase Storage UI
-- Recommended buckets: logos (private), exam-pages (private)
