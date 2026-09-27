-- Run once in the Supabase SQL Editor for the existing Scribe project.
-- This replaces recursive profiles policies with protected helper lookups.

begin;

alter table public.organisations
  add column if not exists created_by uuid references auth.users(id) on delete set null;

drop policy if exists "Users can create an organisation" on public.organisations;
drop policy if exists "Users can create their own organisation" on public.organisations;
create policy "Users can create their own organisation"
on public.organisations for insert to authenticated
with check (created_by = (select auth.uid()));

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

drop policy if exists "Users update their own profile" on public.profiles;
drop policy if exists "Users view profiles in org" on public.profiles;
drop policy if exists "Admins manage profiles" on public.profiles;
drop policy if exists "Users create their organisation" on public.profiles;
drop policy if exists "Users view their own profile or organisation members" on public.profiles;
drop policy if exists "Admins update organisation profiles" on public.profiles;
drop policy if exists "Users join through their own pending invitation" on public.profiles;

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

-- Invited teachers mark their own invitation accepted when they join.
drop policy if exists "Invitees accept their own invitation" on public.invitations;

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

-- Logo uploads/deletes from the template editor need matching storage rules.
drop policy if exists "Admins manage organisation logos" on storage.objects;

create policy "Admins manage organisation logos"
on storage.objects for all using (
  bucket_id = 'logos'
  and private.is_current_user_org_admin((storage.foldername(name))[1]::uuid)
)
with check (
  bucket_id = 'logos'
  and private.is_current_user_org_admin((storage.foldername(name))[1]::uuid)
);

-- Failed-creation cleanup removes page files it just uploaded.
drop policy if exists "Owners and admins manage exam page files" on storage.objects;
drop policy if exists "Owners and admins remove exam page files" on storage.objects;

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

-- Force PostgREST to see the newly added organisations.created_by column now.
notify pgrst, 'reload schema';

commit;
