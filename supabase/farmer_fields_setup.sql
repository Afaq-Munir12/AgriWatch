create table if not exists public.farmer_fields (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  field_name text not null,
  crop text not null,
  area_acres numeric(10,2) not null check (area_acres > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.farmer_fields enable row level security;

create policy "Farmers can view own fields" on public.farmer_fields for select using (auth.uid() = user_id);
create policy "Farmers can insert own fields" on public.farmer_fields for insert with check (auth.uid() = user_id);
create policy "Farmers can update own fields" on public.farmer_fields for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Farmers can delete own fields" on public.farmer_fields for delete using (auth.uid() = user_id);

create index if not exists farmer_fields_user_id_idx on public.farmer_fields(user_id);
