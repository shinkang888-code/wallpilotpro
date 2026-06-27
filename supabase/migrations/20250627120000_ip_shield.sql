-- WallPilot IP Shield — violation audit log

create table if not exists public.ip_violation_log (
  id uuid primary key default gen_random_uuid(),
  violation_type text not null check (violation_type in (
    'clone_embed', 'foreign_origin', 'scraper_ua', 'copy_attempt', 'devtools_probe'
  )),
  host text,
  origin text,
  referer text,
  user_agent text,
  fingerprint text,
  detail jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists ip_violation_log_type_idx on public.ip_violation_log (violation_type, created_at desc);
create index if not exists ip_violation_log_created_idx on public.ip_violation_log (created_at desc);

alter table public.ip_violation_log enable row level security;

-- No public read/write — service role inserts from server functions only
