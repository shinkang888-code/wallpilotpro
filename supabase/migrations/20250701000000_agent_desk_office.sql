-- Agent Desk AI Office (Lonex Trade Office engine port)

create table if not exists public.office_dept_profiles (
  user_id uuid not null references auth.users(id) on delete cascade,
  dept_slug text not null,
  real_member_name text,
  updated_at timestamptz not null default now(),
  primary key (user_id, dept_slug)
);

create table if not exists public.office_event_log (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  actor text,
  message text not null,
  created_at timestamptz not null default now()
);

create index if not exists office_event_log_user_created_idx
  on public.office_event_log (user_id, created_at desc);

alter table public.office_dept_profiles enable row level security;
alter table public.office_event_log enable row level security;

create policy "office_dept_profiles_own"
  on public.office_dept_profiles for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "office_event_log_own_read"
  on public.office_event_log for select
  using (auth.uid() = user_id);

create policy "office_event_log_own_insert"
  on public.office_event_log for insert
  with check (auth.uid() = user_id);
