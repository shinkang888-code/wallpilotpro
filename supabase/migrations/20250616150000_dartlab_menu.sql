-- DARTLAB menu permissions

insert into public.menu_tier_permissions (menu_id, tier, can_view, can_execute, can_export_pdf) values
  ('dart_lab', 'free', true, false, false),
  ('dart_lab', 'day_trading', true, true, true),
  ('dart_lab', 'premium', true, true, true),
  ('dart_lab', 'elite', true, true, true)
on conflict (menu_id, tier) do update set
  can_view = excluded.can_view,
  can_execute = excluded.can_execute,
  can_export_pdf = excluded.can_export_pdf,
  updated_at = now();
