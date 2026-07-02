-- Agent Desk Phase 4: FSM spatial snapshots for SSE replay

create table if not exists public.office_fsm_snapshots (
  id bigserial primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  order_id uuid references public.office_ceo_orders(id) on delete cascade,
  fsm_state text not null,
  version int not null default 1,
  agents jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists office_fsm_snapshots_user_created_idx
  on public.office_fsm_snapshots (user_id, created_at desc);

create index if not exists office_fsm_snapshots_order_idx
  on public.office_fsm_snapshots (order_id, version);

alter table public.office_fsm_snapshots enable row level security;

create policy "office_fsm_snapshots_own"
  on public.office_fsm_snapshots for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
