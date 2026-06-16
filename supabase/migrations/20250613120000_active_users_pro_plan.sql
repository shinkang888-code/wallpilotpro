-- Grant Pro access to already-active users stuck on free/inactive (beta onboarding fix).
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

-- Bootstrap admins should have elite access.
update public.subscriptions s
set
  plan = 'elite',
  status = 'active',
  updated_at = now()
from public.profiles p
where p.id = s.user_id
  and p.role = 'admin'
  and p.account_status = 'active'
  and s.plan = 'free';

-- New-user trigger: bootstrap admin gets elite subscription.
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
  values (
    new.id,
    case when is_bootstrap then 'elite' else 'free' end,
    case when is_bootstrap then 'active' else 'inactive' end
  );

  return new;
end;
$$;
