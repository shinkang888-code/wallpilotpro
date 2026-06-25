-- Crypto Bot (Freqtrade) menu permissions
insert into public.menu_tier_permissions (menu_id, tier, can_view, can_execute, can_export_pdf)
values
  ('crypto_bot', 'free', true, false, false),
  ('crypto_bot', 'day_trading', true, false, false),
  ('crypto_bot', 'premium', true, true, true),
  ('crypto_bot', 'elite', true, true, true)
on conflict (menu_id, tier) do nothing;
