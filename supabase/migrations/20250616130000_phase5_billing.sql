-- Phase 5: payment provider + Danal billing fields

alter table public.subscriptions
  add column if not exists payment_provider text not null default 'stripe'
    check (payment_provider in ('stripe', 'danal', 'manual')),
  add column if not exists danal_billing_key text,
  add column if not exists danal_user_id text,
  add column if not exists danal_last_transaction_id text;

create index if not exists subscriptions_payment_provider_idx
  on public.subscriptions (payment_provider);
