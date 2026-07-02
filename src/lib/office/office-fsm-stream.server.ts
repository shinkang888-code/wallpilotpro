import { resolveAuthSession } from "@/lib/auth/session.server";
import { isTrialDemoMode } from "@/lib/membership/trial-demo";
import { loadFsmSnapshots } from "@/lib/office/office-fsm.server";

const REPLAY_MS = 550;
const HEARTBEAT_MS = 15_000;
const POLL_MS = 2000;

function sseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export async function handleOfficeFsmStream(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const token = url.searchParams.get("token") ?? "";
  const orderId = url.searchParams.get("orderId") ?? undefined;

  const session = token ? await resolveAuthSession(token) : null;
  if (!session?.user.id) {
    if (!isTrialDemoMode()) {
      return new Response("unauthorized", { status: 401 });
    }
    return new Response("auth_required_for_fsm", { status: 401 });
  }

  const userId = session.user.id;
  const encoder = new TextEncoder();
  let lastId = 0;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        controller.enqueue(encoder.encode(sseEvent(event, data)));
      };

      const history = await loadFsmSnapshots(userId, { orderId, limit: 80 });
      for (const snap of history) {
        send("snapshot", snap);
        lastId = Math.max(lastId, snap.id);
        await new Promise((r) => setTimeout(r, REPLAY_MS));
      }
      send("replay_done", { lastId });

      const poll = async () => {
        while (!closed) {
          const fresh = await loadFsmSnapshots(userId, {
            orderId,
            sinceId: lastId,
            limit: 20,
          });
          for (const snap of fresh) {
            send("snapshot", snap);
            lastId = Math.max(lastId, snap.id);
          }
          send("heartbeat", { ts: Date.now() });
          await new Promise((r) => setTimeout(r, POLL_MS));
        }
      };

      void poll();
    },
    cancel() {
      closed = true;
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

void HEARTBEAT_MS;
