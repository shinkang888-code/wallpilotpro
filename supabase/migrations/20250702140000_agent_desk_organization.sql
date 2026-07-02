-- Agent Desk Phase 2: Organization CRUD, Employee Persona, Report Archive, CEO Bulk Orders

create table if not exists public.office_user_departments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  slug text not null,
  label text not null,
  color text not null default '#3182f6',
  icon text,
  sort int not null default 0,
  is_active boolean not null default true,
  mission text,
  constitution_role text not null default 'operator',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.office_user_employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  seed_employee_id int,
  slug text not null,
  department_slug text not null,
  name text not null,
  description text,
  emoji text,
  vibe text,
  constitution_role text not null default 'operator',
  constitution_prompt text,
  is_leader boolean not null default false,
  sort int not null default 0,
  is_active boolean not null default true,
  status text not null default 'idle',
  current_task text,
  workspace_x_pct numeric(5,2) default 50,
  workspace_y_pct numeric(5,2) default 50,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table if not exists public.office_reports (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  department_slug text not null,
  department_label text not null,
  employee_slug text,
  employee_name text,
  title text not null,
  summary text,
  body text not null,
  user_prompt text,
  links jsonb not null default '[]'::jsonb,
  source_type text not null default 'chat',
  ceo_order_id uuid,
  fsm_state text not null default 'COMPLETED',
  created_at timestamptz not null default now()
);

create table if not exists public.office_ceo_orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message text not null,
  target_mode text not null default 'all',
  target_dept_slugs text[] not null default '{}',
  status text not null default 'pending',
  fsm_state text not null default 'CEO_INPUTED',
  version int not null default 1,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.office_ceo_order_results (
  id bigserial primary key,
  order_id uuid not null references public.office_ceo_orders(id) on delete cascade,
  department_slug text not null,
  department_label text not null,
  employee_slug text,
  employee_name text,
  summary text,
  body text,
  status text not null default 'pending',
  error_message text,
  created_at timestamptz not null default now()
);

create index if not exists office_user_departments_user_idx
  on public.office_user_departments (user_id, sort);

create index if not exists office_user_employees_user_dept_idx
  on public.office_user_employees (user_id, department_slug, sort);

create index if not exists office_reports_user_created_idx
  on public.office_reports (user_id, created_at desc);

create index if not exists office_ceo_orders_user_created_idx
  on public.office_ceo_orders (user_id, created_at desc);

alter table public.office_user_departments enable row level security;
alter table public.office_user_employees enable row level security;
alter table public.office_reports enable row level security;
alter table public.office_ceo_orders enable row level security;
alter table public.office_ceo_order_results enable row level security;

create policy "office_user_departments_own"
  on public.office_user_departments for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "office_user_employees_own"
  on public.office_user_employees for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "office_reports_own"
  on public.office_reports for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "office_ceo_orders_own"
  on public.office_ceo_orders for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "office_ceo_order_results_own"
  on public.office_ceo_order_results for all
  using (
    exists (
      select 1 from public.office_ceo_orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.office_ceo_orders o
      where o.id = order_id and o.user_id = auth.uid()
    )
  );
