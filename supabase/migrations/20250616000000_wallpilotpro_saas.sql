-- WallPilot Pro: 4-tier SaaS extensions

-- Extend subscription plans with premium tier
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check
  check (plan in ('free', 'basic', 'pro', 'premium', 'elite'));

-- Admin-configurable menu permissions per membership tier
create table if not exists public.menu_tier_permissions (
  menu_id text not null,
  tier text not null check (tier in ('free', 'day_trading', 'premium', 'elite')),
  can_view boolean not null default false,
  can_execute boolean not null default false,
  can_export_pdf boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (menu_id, tier)
);

-- User activity audit trail
create table if not exists public.user_activity_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null check (event_type in (
    'login', 'logout', 'page_view', 'feature_execute', 'pdf_export', 'menu_denied'
  )),
  menu_id text,
  detail jsonb not null default '{}'::jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists user_activity_log_user_idx on public.user_activity_log (user_id, created_at desc);
create index if not exists user_activity_log_event_idx on public.user_activity_log (event_type, created_at desc);

-- Security audit runs (fireauto-inspired)
create table if not exists public.security_audit_log (
  id uuid primary key default gen_random_uuid(),
  run_by uuid references auth.users(id) on delete set null,
  status text not null check (status in ('pass', 'warn', 'fail')),
  findings jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.menu_tier_permissions enable row level security;
alter table public.user_activity_log enable row level security;
alter table public.security_audit_log enable row level security;

-- Seed default menu permissions (admin can override via UI)
insert into public.menu_tier_permissions (menu_id, tier, can_view, can_execute, can_export_pdf) values
  ('scanner', 'free', true, false, false),
  ('scanner', 'day_trading', true, true, false),
  ('scanner', 'premium', true, true, true),
  ('scanner', 'elite', true, true, true),
  ('wall_report', 'free', false, false, false),
  ('wall_report', 'day_trading', true, true, false),
  ('wall_report', 'premium', true, true, true),
  ('wall_report', 'elite', true, true, true),
  ('ai_pilot', 'free', false, false, false),
  ('ai_pilot', 'day_trading', false, false, false),
  ('ai_pilot', 'premium', true, true, true),
  ('ai_pilot', 'elite', true, true, true),
  ('agent_desk', 'free', false, false, false),
  ('agent_desk', 'day_trading', false, false, false),
  ('agent_desk', 'premium', true, true, true),
  ('agent_desk', 'elite', true, true, true),
  ('signal_hub', 'free', true, false, false),
  ('signal_hub', 'day_trading', true, true, false),
  ('signal_hub', 'premium', true, true, true),
  ('signal_hub', 'elite', true, true, true),
  ('rl_lab', 'free', false, false, false),
  ('rl_lab', 'day_trading', false, false, false),
  ('rl_lab', 'premium', false, false, false),
  ('rl_lab', 'elite', true, true, true),
  ('my_api', 'free', true, true, false),
  ('my_api', 'day_trading', true, true, false),
  ('my_api', 'premium', true, true, false),
  ('my_api', 'elite', true, true, false),
  ('pricing', 'free', true, true, false),
  ('pricing', 'day_trading', true, true, false),
  ('pricing', 'premium', true, true, false),
  ('pricing', 'elite', true, true, false)
on conflict (menu_id, tier) do nothing;
