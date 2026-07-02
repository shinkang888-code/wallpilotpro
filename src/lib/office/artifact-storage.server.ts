import { getSupabaseAdmin, isSupabaseConfigured } from "@/lib/db/supabase.server";
import type { CeoOrder } from "@/lib/office/types";

function buildZipEntries(order: CeoOrder): Array<{ path: string; content: string }> {
  const entries: Array<{ path: string; content: string }> = [
    {
      path: "README.txt",
      content: [
        "WallPilot Pro CEO 일괄 지시 아카이브",
        `지시: ${order.message}`,
        `상태: ${order.fsm_state}`,
        `생성: ${new Date(order.created_at).toLocaleString("ko-KR")}`,
      ].join("\n"),
    },
  ];

  for (const r of order.results ?? []) {
    if (!r.body) continue;
    const safe = r.department_label.replace(/[<>:"/\\|?*]/g, "_");
    entries.push({
      path: `reports/${safe}.md`,
      content: `# ${r.department_label}\n\n${r.summary ? `> ${r.summary}\n\n` : ""}${r.body}`,
    });
    entries.push({
      path: `reports/${safe}.txt`,
      content: [r.department_label, r.summary ?? "", "", r.body].join("\n"),
    });
  }
  return entries;
}

/** Store-format ZIP (no compression) for serverless compatibility */
function buildStoreZip(entries: Array<{ path: string; content: string }>): Uint8Array {
  const parts: Uint8Array[] = [];
  let offset = 0;
  const central: Uint8Array[] = [];

  const enc = new TextEncoder();

  for (const entry of entries) {
    const nameBytes = enc.encode(entry.path);
    const dataBytes = enc.encode(entry.content);
    const localHeader = new Uint8Array(30 + nameBytes.length);
    const view = new DataView(localHeader.buffer);
    view.setUint32(0, 0x04034b50, true);
    view.setUint16(4, 20, true);
    view.setUint16(26, nameBytes.length, true);
    view.setUint32(18, dataBytes.length, true);
    localHeader.set(nameBytes, 30);

    parts.push(localHeader, dataBytes);

    const cd = new Uint8Array(46 + nameBytes.length);
    const cdView = new DataView(cd.buffer);
    cdView.setUint32(0, 0x02014b50, true);
    cdView.setUint16(4, 20, true);
    cdView.setUint16(6, 20, true);
    cdView.setUint16(28, nameBytes.length, true);
    cdView.setUint32(16, dataBytes.length, true);
    cdView.setUint32(20, offset, true);
    cd.set(nameBytes, 46);
    central.push(cd);

    offset += localHeader.length + dataBytes.length;
  }

  const centralSize = central.reduce((s, c) => s + c.length, 0);
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, offset, true);

  const total = new Uint8Array(offset + centralSize + 22);
  let pos = 0;
  for (const p of parts) {
    total.set(p, pos);
    pos += p.length;
  }
  for (const c of central) {
    total.set(c, pos);
    pos += c.length;
  }
  total.set(end, pos);
  return total;
}

export async function uploadCeoOrderZipArtifact(
  userId: string,
  order: CeoOrder,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const entries = buildZipEntries(order);
  if (entries.length <= 1) return null;

  const zipBytes = buildStoreZip(entries);
  const path = `${userId}/${order.id}/ceo-bundle.zip`;

  const { error } = await admin.storage.from("office-artifacts").upload(path, zipBytes, {
    contentType: "application/zip",
    upsert: true,
  });

  if (error) {
    console.error("office artifact upload failed", error.message);
    return null;
  }

  return path;
}

export async function getArtifactSignedUrl(
  path: string,
  expiresIn = 3600,
): Promise<string | null> {
  if (!isSupabaseConfigured()) return null;
  const admin = getSupabaseAdmin();
  if (!admin) return null;

  const { data, error } = await admin.storage
    .from("office-artifacts")
    .createSignedUrl(path, expiresIn);

  if (error || !data?.signedUrl) return null;
  return data.signedUrl;
}
