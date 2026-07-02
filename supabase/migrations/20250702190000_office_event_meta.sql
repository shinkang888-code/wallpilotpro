-- 업무 지시 진행도·완료보고 메타데이터
alter table public.office_event_log
  add column if not exists meta jsonb not null default '{}'::jsonb;

create index if not exists office_event_log_meta_task_idx
  on public.office_event_log ((meta->>'task_id'))
  where (meta->>'task_id') is not null;
