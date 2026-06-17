-- TradeMaster worker async job fields

alter table public.tm_rl_jobs
  add column if not exists run_mode text not null default 'quick'
    check (run_mode in ('quick', 'full')),
  add column if not exists phase text not null default 'done'
    check (phase in ('idle', 'train', 'test', 'done')),
  add column if not exists progress_pct int not null default 100
    check (progress_pct >= 0 and progress_pct <= 100),
  add column if not exists progress_message text,
  add column if not exists trademaster_session_id text;

create index if not exists tm_rl_jobs_running_idx
  on public.tm_rl_jobs (user_id, status)
  where status in ('queued', 'running');
