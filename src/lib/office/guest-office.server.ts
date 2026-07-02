import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import {
  EMPTY_GUEST_PAYLOAD,
  type GuestWorkspacePayload,
} from "@/lib/office/guest-types";

const GUEST_ID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isValidGuestId(id: string | null | undefined): id is string {
  return !!id && GUEST_ID_RE.test(id);
}

export async function loadGuestWorkspace(guestId: string): Promise<GuestWorkspacePayload> {
  if (!isSupabaseConfigured() || !isValidGuestId(guestId)) return { ...EMPTY_GUEST_PAYLOAD };
  const admin = getSupabaseAdmin();
  if (!admin) return { ...EMPTY_GUEST_PAYLOAD };

  const { data } = await admin
    .from("office_guest_workspace")
    .select("payload")
    .eq("guest_id", guestId)
    .maybeSingle();

  if (!data?.payload) return { ...EMPTY_GUEST_PAYLOAD };
  return { ...EMPTY_GUEST_PAYLOAD, ...(data.payload as GuestWorkspacePayload) };
}

export async function saveGuestWorkspace(
  guestId: string,
  payload: GuestWorkspacePayload,
): Promise<void> {
  if (!isSupabaseConfigured() || !isValidGuestId(guestId)) return;
  const admin = getSupabaseAdmin();
  if (!admin) return;

  await admin.from("office_guest_workspace").upsert(
    {
      guest_id: guestId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "guest_id" },
  );
}

export type OfficeActor =
  | { kind: "user"; id: string }
  | { kind: "guest"; id: string };

export function resolveOfficeActor(input: {
  userId?: string | null;
  guestId?: string | null;
}): OfficeActor | null {
  if (input.userId) return { kind: "user", id: input.userId };
  if (isValidGuestId(input.guestId)) return { kind: "guest", id: input.guestId };
  return null;
}
