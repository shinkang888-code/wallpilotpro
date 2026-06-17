-- Subscription system: sub_admin role, Google→Free auto signup, staff seed, unpaid downgrade

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check check (role in ('user', 'admin', 'sub_admin'));

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bootstrap_email text := nullif(current_setting('app.bootstrap_admin_email', true), '');
  user_email text := lower(coalesce(new.email, ''));
  assigned_role text := 'user';
  assigned_status text := 'active';
  assigned_plan text := 'free';
  assigned_sub_status text := 'inactive';
begin
  if user_email = 'shinkang888@gmail.com'
     or (bootstrap_email is not null and user_email = lower(bootstrap_email)) then
    assigned_role := 'admin';
    assigned_plan := 'elite';
    assigned_sub_status := 'active';
  elsif user_email = 'kangjunchul8@gmail.com' then
    assigned_role := 'sub_admin';
  end if;

  insert into public.profiles (id, email, display_name, avatar_url, account_status, role, approved_at)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    assigned_status,
    assigned_role,
    now()
  );

  insert into public.subscriptions (user_id, plan, status)
  values (new.id, assigned_plan, assigned_sub_status);

  return new;
end;
$$;

-- Staff role seed (existing accounts)
update public.profiles
set role = 'admin', account_status = 'active', approved_at = coalesce(approved_at, now()), updated_at = now()
where lower(email) = 'shinkang888@gmail.com';

update public.profiles
set role = 'sub_admin', account_status = 'active', approved_at = coalesce(approved_at, now()), updated_at = now()
where lower(email) = 'kangjunchul8@gmail.com';

update public.subscriptions s
set plan = 'elite', status = 'active', updated_at = now()
from public.profiles p
where p.id = s.user_id and lower(p.email) = 'shinkang888@gmail.com';

-- Activate legacy pending users as Free (no paid grant)
update public.profiles
set account_status = 'active', approved_at = coalesce(approved_at, now()), updated_at = now()
where account_status = 'pending';

-- Downgrade users without active payment provider linkage (beta Pro grants)
update public.subscriptions s
set
  plan = 'free',
  status = 'inactive',
  updated_at = now()
from public.profiles p
where p.id = s.user_id
  and p.role in ('user', 'sub_admin')
  and s.plan <> 'free'
  and coalesce(s.payment_provider, 'stripe') <> 'manual'
  and s.stripe_subscription_id is null
  and s.danal_billing_key is null;
