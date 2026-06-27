-- Phase 4: decision memory log (WallPilot trading memory)
create table if not exists public.decision_log (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  ticker text not null,
  market text not null check (market in ('KR', 'US')),
  event_type text not null check (event_type in ('scan', 'order', 'deep_report', 'risk_gate')),
  rating text,
  price_at_decision numeric,
  bull_case text,
  bear_case text,
  risk_approved boolean,
  outcome_pct numeric,
  reflected_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists decision_log_ticker_idx on public.decision_log (ticker);
create index if not exists decision_log_created_at_idx on public.decision_log (created_at desc);
create index if not exists decision_log_reflection_idx on public.decision_log (outcome_pct) where outcome_pct is null;

alter table public.decision_log enable row level security;

-- No anon/authenticated policies: server uses service_role only.
