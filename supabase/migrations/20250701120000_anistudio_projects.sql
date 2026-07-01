-- AniStudio character projects (JSONB)

create table if not exists public.anistudio_projects (
  id text primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  department_slug text,
  data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists anistudio_projects_user_idx
  on public.anistudio_projects (user_id, updated_at desc);

create unique index if not exists anistudio_projects_user_dept_uidx
  on public.anistudio_projects (user_id, department_slug)
  where department_slug is not null;

alter table public.anistudio_projects enable row level security;

create policy "anistudio_projects_own"
  on public.anistudio_projects for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
