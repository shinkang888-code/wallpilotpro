-- Phase 5: Guest workspace + artifact storage metadata

create table if not exists public.office_guest_workspace (
  guest_id text primary key,
  payload jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.office_reports
  add column if not exists artifact_path text,
  add column if not exists artifact_mime text;

alter table public.office_ceo_orders
  add column if not exists artifact_path text;

create index if not exists office_guest_workspace_updated_idx
  on public.office_guest_workspace (updated_at desc);

-- Service role only (no RLS — accessed via admin client with guest_id validation server-side)

insert into storage.buckets (id, name, public)
values ('office-artifacts', 'office-artifacts', false)
on conflict (id) do nothing;

create policy "office_artifacts_service"
  on storage.objects for all
  using (bucket_id = 'office-artifacts')
  with check (bucket_id = 'office-artifacts');
