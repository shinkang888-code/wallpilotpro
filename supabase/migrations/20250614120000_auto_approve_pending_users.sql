-- Beta onboarding: activate existing pending users and grant Pro access.
update public.profiles
set
  account_status = 'active',
  approved_at = coalesce(approved_at, now()),
  updated_at = now()
where account_status = 'pending';

update public.subscriptions s
set
  plan = 'pro',
  status = 'active',
  updated_at = now()
from public.profiles p
where p.id = s.user_id
  and p.account_status = 'active'
  and p.role = 'user'
  and s.plan = 'free'
  and s.status in ('inactive', 'canceled');
