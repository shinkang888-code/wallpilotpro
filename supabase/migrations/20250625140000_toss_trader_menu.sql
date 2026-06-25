-- Toss Trader desk menu permissions
insert into public.menu_tier_permissions (menu_id, tier, can_view, can_execute, can_export_pdf)
values
  ('toss_trader', 'free', true, false, false),
  ('toss_trader', 'day_trading', true, true, false),
  ('toss_trader', 'premium', true, true, true),
  ('toss_trader', 'elite', true, true, true)
on conflict (menu_id, tier) do nothing;
