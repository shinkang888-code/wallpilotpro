-- Agent Desk trial: open to all membership tiers (demo period)
update public.menu_tier_permissions
set can_view = true, can_execute = true, can_export_pdf = true
where menu_id = 'agent_desk' and tier in ('free', 'day_trading');
