-- Remove deprecated nav menus: Signal Hub, RL Lab, Crypto Bot (still reachable via direct URL / Toss Trader embed)
delete from public.menu_tier_permissions
where menu_id in ('signal_hub', 'rl_lab', 'crypto_bot');
