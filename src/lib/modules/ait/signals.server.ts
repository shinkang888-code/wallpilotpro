import { getServerConfig } from "@/lib/config.server";
import { getSupabaseAdmin } from "@/lib/db/supabase.server";
import type { AitFeedResponse, AitMessageType, AitSignal, AitSignalReply } from "@/lib/modules/ait/types";

type SignalRow = {
  id: string;
  author_id: string | null;
  author_name: string;
  message_type: AitMessageType;
  market: string;
  symbol: string | null;
  side: string | null;
  title: string | null;
  content: string;
  tags: string[] | null;
  quality_score: number | null;
  reply_count: number;
  source: "wallpilot" | "ai-trader";
  created_at: string;
};

function mapSignal(row: SignalRow): AitSignal {
  return {
    id: row.id,
    authorId: row.author_id,
    authorName: row.author_name,
    messageType: row.message_type,
    market: row.market,
    symbol: row.symbol,
    side: row.side,
    title: row.title,
    content: row.content,
    tags: row.tags ?? [],
    qualityScore: row.quality_score,
    replyCount: row.reply_count,
    source: row.source,
    createdAt: row.created_at,
  };
}

async function fetchExternalFeed(input: {
  messageType?: AitMessageType;
  limit: number;
  offset: number;
}): Promise<AitFeedResponse | null> {
  const { aitServiceUrl } = getServerConfig();
  if (!aitServiceUrl) return null;

  try {
    const params = new URLSearchParams({
      limit: String(input.limit),
      offset: String(input.offset),
    });
    if (input.messageType) params.set("message_type", input.messageType);

    const res = await fetch(`${aitServiceUrl.replace(/\/$/, "")}/api/signals/feed?${params}`, {
      signal: AbortSignal.timeout(15_000),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as {
      signals?: Array<Record<string, unknown>>;
      total?: number;
    };
    if (!json.signals?.length) return null;

    const signals: AitSignal[] = json.signals.map((s, i) => ({
      id: String(s.id ?? s.signal_id ?? `ext-${i}`),
      authorId: null,
      authorName: String(s.agent_name ?? s.author_name ?? "Agent"),
      messageType: (s.message_type as AitMessageType) ?? "strategy",
      market: String(s.market ?? "us-stock"),
      symbol: s.symbol ? String(s.symbol) : null,
      side: s.side ? String(s.side) : null,
      title: s.title ? String(s.title) : null,
      content: String(s.content ?? s.title ?? ""),
      tags: Array.isArray(s.tags) ? s.tags.map(String) : [],
      qualityScore: typeof s.quality_score === "number" ? s.quality_score : null,
      replyCount: typeof s.reply_count === "number" ? s.reply_count : 0,
      source: "ai-trader",
      createdAt: String(s.created_at ?? new Date().toISOString()),
    }));

    return { signals, total: json.total ?? signals.length, source: "ai-trader" };
  } catch {
    return null;
  }
}

export async function listSignalFeed(input: {
  messageType?: AitMessageType;
  limit?: number;
  offset?: number;
}): Promise<AitFeedResponse> {
  const external = await fetchExternalFeed({
    messageType: input.messageType,
    limit: input.limit ?? 20,
    offset: input.offset ?? 0,
  });
  if (external) return external;

  const admin = getSupabaseAdmin();
  if (!admin) return { signals: [], total: 0, source: "wallpilot" };

  let query = admin
    .from("ait_signals")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(input.offset ?? 0, (input.offset ?? 0) + (input.limit ?? 20) - 1);

  if (input.messageType) query = query.eq("message_type", input.messageType);

  const { data, count, error } = await query;
  if (error) throw new Error(error.message);

  return {
    signals: (data as SignalRow[]).map(mapSignal),
    total: count ?? 0,
    source: "wallpilot",
  };
}

export async function createSignal(input: {
  authorId: string;
  authorName: string;
  messageType: AitMessageType;
  market: string;
  symbol?: string;
  side?: string;
  title?: string;
  content: string;
  tags?: string[];
}): Promise<AitSignal> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase_not_configured");

  const { data, error } = await admin
    .from("ait_signals")
    .insert({
      author_id: input.authorId,
      author_name: input.authorName,
      message_type: input.messageType,
      market: input.market,
      symbol: input.symbol ?? null,
      side: input.side ?? null,
      title: input.title ?? null,
      content: input.content,
      tags: input.tags ?? [],
      source: "wallpilot",
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return mapSignal(data as SignalRow);
}

export async function listSignalReplies(signalId: string): Promise<AitSignalReply[]> {
  const admin = getSupabaseAdmin();
  if (!admin) return [];

  const { data, error } = await admin
    .from("ait_signal_replies")
    .select("*")
    .eq("signal_id", signalId)
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);

  return (data ?? []).map((row) => ({
    id: row.id as string,
    signalId: row.signal_id as string,
    authorId: row.author_id as string | null,
    authorName: row.author_name as string,
    content: row.content as string,
    accepted: Boolean(row.accepted),
    createdAt: row.created_at as string,
  }));
}

export async function addSignalReply(input: {
  signalId: string;
  authorId: string;
  authorName: string;
  content: string;
}): Promise<AitSignalReply> {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error("supabase_not_configured");

  const { data, error } = await admin
    .from("ait_signal_replies")
    .insert({
      signal_id: input.signalId,
      author_id: input.authorId,
      author_name: input.authorName,
      content: input.content,
    })
    .select("*")
    .single();

  if (error) throw new Error(error.message);

  const { data: parent } = await admin
    .from("ait_signals")
    .select("reply_count")
    .eq("id", input.signalId)
    .maybeSingle();

  await admin
    .from("ait_signals")
    .update({ reply_count: ((parent?.reply_count as number) ?? 0) + 1 })
    .eq("id", input.signalId);

  const row = data as Record<string, unknown>;
  return {
    id: row.id as string,
    signalId: row.signal_id as string,
    authorId: row.author_id as string | null,
    authorName: row.author_name as string,
    content: row.content as string,
    accepted: Boolean(row.accepted),
    createdAt: row.created_at as string,
  };
}
