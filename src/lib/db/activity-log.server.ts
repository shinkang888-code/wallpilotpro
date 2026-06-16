import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import type { ActivityEventType, UserActivityRow } from "@/lib/types/auth";

export async function logUserActivity(input: {
  userId?: string | null;
  eventType: ActivityEventType;
  menuId?: string | null;
  detail?: Record<string, string | number | boolean | null>;
  ipAddress?: string | null;
  userAgent?: string | null;
}): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("user_activity_log").insert({
    user_id: input.userId ?? null,
    event_type: input.eventType,
    menu_id: input.menuId ?? null,
    detail: input.detail ?? {},
    ip_address: input.ipAddress ?? null,
    user_agent: input.userAgent ?? null,
  });
}

export async function listUserActivity(limit = 100): Promise<UserActivityRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("user_activity_log")
    .select("id, user_id, event_type, menu_id, detail, ip_address, user_agent, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error || !data?.length) return [];

  const userIds = [...new Set(data.map((r) => r.user_id).filter(Boolean))] as string[];
  const emailMap = new Map<string, string>();
  if (userIds.length) {
    const { data: profiles } = await admin.from("profiles").select("id, email").in("id", userIds);
    for (const p of profiles ?? []) emailMap.set(p.id, p.email);
  }

  return data.map((row) => ({
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type as ActivityEventType,
    menuId: row.menu_id,
    detail: (row.detail ?? {}) as Record<string, string | number | boolean | null>,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
    userEmail: row.user_id ? (emailMap.get(row.user_id) ?? null) : null,
  }));
}

export async function listUserActivityForUser(userId: string, limit = 50): Promise<UserActivityRow[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data } = await admin
    .from("user_activity_log")
    .select("id, user_id, event_type, menu_id, detail, ip_address, user_agent, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    eventType: row.event_type as ActivityEventType,
    menuId: row.menu_id,
    detail: (row.detail ?? {}) as Record<string, string | number | boolean | null>,
    ipAddress: row.ip_address,
    userAgent: row.user_agent,
    createdAt: row.created_at,
  }));
}
