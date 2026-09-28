-- ============================================================================
-- AgriWatch — Complaints & Software Issue Reports
-- Run this ONCE in Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: every statement is guarded with "if not exists".
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. complaints
--    Field complaints submitted by FARMERS and the GENERAL PUBLIC
--    (crop failure, irrigation shortage, livestock loss, ...).
--    Read + actioned by: PDMA officer portal (/pdma/complaints)
--                        Admin portal        (/admin-portal/complaints)
-- ----------------------------------------------------------------------------
create table if not exists public.complaints (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,              -- human-friendly id, e.g. CMP-8F3A21
  user_id         uuid references auth.users (id) on delete set null,
  reporter_name   text,
  reporter_role   text not null default 'farmer',    -- farmer | public
  reporter_phone  text,
  district        text,
  category        text,                              -- Crop Failure | Irrigation Shortage | ...
  description     text,
  photo_url       text,                              -- storage URL, or an inline data: URL fallback
  status          text not null default 'Under Review', -- Under Review | Forwarded | Resolved
  resolution_note text,
  handled_by      text,                              -- email of the officer who last updated it
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index if not exists complaints_created_at_idx on public.complaints (created_at desc);
create index if not exists complaints_status_idx     on public.complaints (status);
create index if not exists complaints_district_idx   on public.complaints (district);


-- ----------------------------------------------------------------------------
-- 2. issue_reports
--    "Something is broken in the software" reports. Raised by FARMERS,
--    PUBLIC users and PDMA OFFICERS.
--    Read + actioned by: Admin portal (/admin-portal/issues).
--    PDMA officers can see the ones they raised themselves.
-- ----------------------------------------------------------------------------
create table if not exists public.issue_reports (
  id              uuid primary key default gen_random_uuid(),
  ref             text unique not null,              -- e.g. BUG-4C91D0
  user_id         uuid references auth.users (id) on delete set null,
  reporter_name   text,
  reporter_email  text,
  reporter_role   text not null default 'farmer',    -- farmer | public | pdma
  district        text,
  area            text,                              -- which screen: Login, Drought Map, Alerts, ...
  severity        text not null default 'Medium',    -- Low | Medium | High | Critical
  title           text,
  description     text,
  screenshot_url  text,
  page_url        text,                              -- where they were when it broke
  user_agent      text,                              -- browser / device string
  status          text not null default 'Open',      -- Open | In Progress | Resolved | Closed
  admin_note      text,                              -- reply shown back to the reporter
  handled_by      text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz
);

create index if not exists issue_reports_created_at_idx on public.issue_reports (created_at desc);
create index if not exists issue_reports_status_idx     on public.issue_reports (status);
create index if not exists issue_reports_role_idx       on public.issue_reports (reporter_role);


-- ----------------------------------------------------------------------------
-- 3. Realtime — so a complaint filed on the farmer portal pops up on the
--    PDMA / Admin portal without anyone hitting refresh.
-- ----------------------------------------------------------------------------
do $$
begin
  begin
    alter publication supabase_realtime add table public.complaints;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.issue_reports;
  exception when duplicate_object then null;
  end;
end $$;


-- ----------------------------------------------------------------------------
-- 4. Row Level Security
--
--    These policies are deliberately OPEN so the project demos cleanly:
--    anyone (including a not-signed-in visitor on the public portal) can
--    file a complaint, and the portals can read and update them.
--
--    ➜ To harden this later, see the commented "STRICTER" block at the bottom.
-- ----------------------------------------------------------------------------
alter table public.complaints    enable row level security;
alter table public.issue_reports enable row level security;

-- complaints ------------------------------------------------------------------
drop policy if exists "complaints insert any"  on public.complaints;
drop policy if exists "complaints select any"  on public.complaints;
drop policy if exists "complaints update any"  on public.complaints;

create policy "complaints insert any" on public.complaints
  for insert to anon, authenticated with check (true);

create policy "complaints select any" on public.complaints
  for select to anon, authenticated using (true);

create policy "complaints update any" on public.complaints
  for update to anon, authenticated using (true) with check (true);

-- issue_reports ---------------------------------------------------------------
drop policy if exists "issues insert any" on public.issue_reports;
drop policy if exists "issues select any" on public.issue_reports;
drop policy if exists "issues update any" on public.issue_reports;

create policy "issues insert any" on public.issue_reports
  for insert to anon, authenticated with check (true);

create policy "issues select any" on public.issue_reports
  for select to anon, authenticated using (true);

create policy "issues update any" on public.issue_reports
  for update to anon, authenticated using (true) with check (true);


-- ----------------------------------------------------------------------------
-- 5. Storage bucket for complaint photos / bug screenshots.
--    Public bucket = the <img> tags can load the file directly with no
--    signed-URL round trip. If this bucket is missing, the website quietly
--    falls back to storing the image inline in photo_url, so nothing breaks.
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('complaint-photos', 'complaint-photos', true)
on conflict (id) do nothing;

drop policy if exists "complaint photos upload" on storage.objects;
drop policy if exists "complaint photos read"   on storage.objects;

create policy "complaint photos upload" on storage.objects
  for insert to anon, authenticated
  with check (bucket_id = 'complaint-photos');

create policy "complaint photos read" on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'complaint-photos');


-- ============================================================================
-- STRICTER policies (optional — swap in once every portal requires login).
-- Assumes a user_profiles table with a `role` column ('admin', 'pdma', ...).
-- ============================================================================
--
-- create policy "own complaints" on public.complaints
--   for select to authenticated
--   using (
--     user_id = auth.uid()
--     or exists (
--       select 1 from public.user_profiles p
--       where p.id = auth.uid() and p.role in ('admin', 'pdma')
--     )
--   );
--
-- create policy "staff update complaints" on public.complaints
--   for update to authenticated
--   using (
--     exists (
--       select 1 from public.user_profiles p
--       where p.id = auth.uid() and p.role in ('admin', 'pdma')
--     )
--   );
--
-- create policy "admin only issues" on public.issue_reports
--   for select to authenticated
--   using (
--     user_id = auth.uid()
--     or exists (
--       select 1 from public.user_profiles p
--       where p.id = auth.uid() and p.role = 'admin'
--     )
--   );
