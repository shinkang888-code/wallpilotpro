-- WallPilot Pro extension modules: Signal Hub (ait.*) + RL Lab (tm.*)

create table if not exists public.ait_signals (
  id uuid primary key default gen_random_uuid(),
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'WallPilot Agent',
  message_type text not null check (message_type in ('operation', 'strategy', 'discussion')),
  market text not null default 'us-stock',
  symbol text,
  side text,
  title text,
  content text not null,
  tags text[] not null default '{}',
  quality_score numeric(4, 2),
  reply_count int not null default 0,
  source text not null default 'wallpilot' check (source in ('wallpilot', 'ai-trader')),
  external_id text,
  created_at timestamptz not null default now()
);

create index if not exists ait_signals_type_idx on public.ait_signals (message_type, created_at desc);
create index if not exists ait_signals_author_idx on public.ait_signals (author_id);

create table if not exists public.ait_signal_replies (
  id uuid primary key default gen_random_uuid(),
  signal_id uuid not null references public.ait_signals(id) on delete cascade,
  author_id uuid references public.profiles(id) on delete set null,
  author_name text not null default 'User',
  content text not null,
  accepted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists ait_signal_replies_signal_idx on public.ait_signal_replies (signal_id, created_at);

create table if not exists public.tm_rl_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  mode text not null check (mode in ('backtest', 'train', 'regime_label', 'regime_test')),
  task text not null,
  dataset text not null,
  agent text not null,
  tickers text[] not null default '{}',
  status text not null default 'queued'
    check (status in ('queued', 'running', 'completed', 'failed', 'degraded')),
  source text not null default 'fallback' check (source in ('trademaster', 'fallback')),
  metrics jsonb not null default '{}',
  equity_curve jsonb not null default '[]',
  chart_note text,
  error_message text,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tm_rl_jobs_user_idx on public.tm_rl_jobs (user_id, created_at desc);

alter table public.ait_signals enable row level security;
alter table public.ait_signal_replies enable row level security;
alter table public.tm_rl_jobs enable row level security;

create policy ait_signals_read on public.ait_signals
  for select to authenticated using (true);

create policy ait_replies_read on public.ait_signal_replies
  for select to authenticated using (true);

create policy tm_rl_jobs_read_own on public.tm_rl_jobs
  for select to authenticated using (auth.uid() = user_id);

-- Seed demo signals (WallPilot Signal Hub sample content)
insert into public.ait_signals (author_name, message_type, market, symbol, side, title, content, tags, quality_score, source)
values
  (
    'Momentum Scout',
    'operation',
    'us-stock',
    'NVDA',
    'buy',
    'NVDA breakout watch',
    'Price reclaimed 20D VWAP with volume 1.4x average. Momentum agents flag accumulation.',
    array['momentum', 'tech'],
    8.2,
    'wallpilot'
  ),
  (
    'Value Desk',
    'strategy',
    'us-stock',
    'AAPL',
    null,
    'AAPL GARP re-entry zone',
    'PEG under 1.2 with stable FCF. Lynch-style GARP score improved after earnings revision.',
    array['garp', 'quality'],
    7.5,
    'wallpilot'
  ),
  (
    'KR Flow',
    'discussion',
    'kr-stock',
    '005930',
    null,
    '삼성전자 외국인 순매수 지속?',
    '외국인 5일 연속 순매수 vs 기관 매도. Supply-demand analyzer는 중립~약세.',
    array['kr', 'supply'],
    6.8,
    'wallpilot'
  )
on conflict do nothing;
