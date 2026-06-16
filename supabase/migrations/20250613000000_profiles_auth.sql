-- WallPilot: profiles, subscriptions, admin audit

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  account_status text not null default 'pending'
    check (account_status in ('pending', 'active', 'suspended', 'deleted')),
  role text not null default 'user'
    check (role in ('user', 'admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references auth.users(id),
  deleted_at timestamptz
);

create table if not exists public.subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  plan text not null default 'free'
    check (plan in ('free', 'basic', 'pro', 'elite')),
  status text not null default 'inactive'
    check (status in ('inactive', 'trialing', 'active', 'past_due', 'canceled')),
  stripe_customer_id text,
  stripe_subscription_id text,
  current_period_end timestamptz,
  updated_at timestamptz not null default now()
);

create table if not exists public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid not null references auth.users(id),
  target_user_id uuid,
  action text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists profiles_status_idx on public.profiles (account_status);
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists subscriptions_stripe_customer_idx on public.subscriptions (stripe_customer_id);

alter table public.profiles enable row level security;
alter table public.subscriptions enable row level security;
alter table public.admin_audit_log enable row level security;

-- Authenticated users can read their own profile
create policy profiles_select_own on public.profiles
  for select to authenticated
  using (auth.uid() = id);

create policy subscriptions_select_own on public.subscriptions
  for select to authenticated
  using (auth.uid() = user_id);

-- Signup hook: create profile + free subscription row
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bootstrap_email text := nullif(current_setting('app.bootstrap_admin_email', true), '');
  is_bootstrap boolean := false;
begin
  if bootstrap_email is not null and new.email = bootstrap_email then
    is_bootstrap := true;
  end if;

  insert into public.profiles (id, email, display_name, avatar_url, account_status, role)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    case when is_bootstrap then 'active' else 'pending' end,
    case when is_bootstrap then 'admin' else 'user' end
  );

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, 'free', 'inactive');

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Optional: link decisions to users
alter table public.decision_log
  add column if not exists user_id uuid references auth.users(id);
