import { CheckCircle2, Download, Loader2, X } from "lucide-react";
import { useEffect, useState } from "react";

import type { OfficeApiContext } from "@/lib/agent-desk/office-api-context";
import {
  exportChatDocument,
  exportCeoOrderZip,
  type ExportFormat,
} from "@/lib/agent-desk/chat-document-export";
import {
  getAgentDeskArtifactUrl,
  getAgentDeskReports,
  postAgentDeskApproveCeoOrder,
  postAgentDeskCeoBulkOrder,
} from "@/lib/api/office.functions";
import { CEO_FSM_META, type CeoOrderFsmState } from "@/lib/office/constitution";
import type { CeoOrder, CompanyData, OfficeReport } from "@/lib/office/types";
import { useGeminiApiKey } from "@/lib/use-gemini-api-key";

const FORMATS: ExportFormat[] = ["docx", "hwp", "pptx", "pdf", "txt"];

export function ReportArchiveDrawer({
  accessToken,
  guestId,
  onClose,
}: OfficeApiContext & { onClose: () => void }) {
  const [reports, setReports] = useState<OfficeReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void getAgentDeskReports({ data: { accessToken, guestId } }).then((r) => {
      setReports(r);
      setLoading(false);
    });
  }, [accessToken, guestId]);

  return (
    <DrawerShell title="보고서 보관함" subtitle="AI 아티팩트 영속화 · 재다운로드" onClose={onClose}>
      {loading ? (
        <div className="flex justify-center py-8">
          <Loader2 className="size-6 animate-spin text-[#3182f6]" />
        </div>
      ) : reports.length === 0 ? (
        <p className="py-8 text-center text-sm text-[#8b95a1]">
          저장된 보고서가 없습니다. 채팅·일괄 지시 후 자동 저장됩니다.
        </p>
      ) : (
        <div className="max-h-[60vh] space-y-2 overflow-y-auto">
          {reports.map((r) => (
            <div key={r.id} className="rounded-xl border border-[#f2f4f6] p-3">
              <p className="text-sm font-semibold">{r.title}</p>
              <p className="text-[10px] text-[#8b95a1]">
                {r.department_label} · {new Date(r.created_at).toLocaleString("ko-KR")}
              </p>
              {r.summary && (
                <p className="mt-1 text-xs text-[#3182f6]">{r.summary}</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                {(r.artifact_path || r.ceo_order_id) && (
                  <button
                    type="button"
                    onClick={async () => {
                      const { url } = await getAgentDeskArtifactUrl({
                        data: { reportId: r.id, accessToken, guestId },
                      });
                      if (url) window.open(url, "_blank");
                    }}
                    className="rounded-lg bg-[#3182f6]/10 px-2 py-0.5 text-[10px] font-semibold text-[#3182f6]"
                  >
                    서버 ZIP
                  </button>
                )}
                {FORMATS.map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() =>
                      void exportChatDocument(f, {
                        title: r.title,
                        deptLabel: r.department_label,
                        leaderName: r.employee_name ?? "AI",
                        summary: r.summary ?? "",
                        body: r.body,
                        userPrompt: r.user_prompt ?? undefined,
                        links: r.links,
                      })
                    }
                    className="rounded-lg bg-[#f2f4f6] px-2 py-0.5 text-[10px] font-semibold uppercase"
                  >
                    {f}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </DrawerShell>
  );
}

export function CeoBulkCommandPanel({
  company,
  accessToken,
  guestId,
  onClose,
  onDone,
}: OfficeApiContext & {
  company: CompanyData;
  onClose: () => void;
  onDone: () => void;
}) {
  const { key: geminiApiKey } = useGeminiApiKey();
  const [message, setMessage] = useState("");
  const [mode, setMode] = useState<"all" | "selected">("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [order, setOrder] = useState<CeoOrder | null>(null);

  function toggleDept(slug: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) next.delete(slug);
      else next.add(slug);
      return next;
    });
  }

  async function dispatch() {
    if (!message.trim()) return;
    setLoading(true);
    try {
      const result = await postAgentDeskCeoBulkOrder({
        data: {
          message: message.trim(),
          target_mode: mode,
          target_dept_slugs: mode === "selected" ? [...selected] : undefined,
          accessToken,
          guestId,
          geminiApiKey: geminiApiKey ?? undefined,
        },
      });
      setOrder(result);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  async function approve() {
    if (!order) return;
    setLoading(true);
    try {
      const { order: updated } = await postAgentDeskApproveCeoOrder({
        data: { orderId: order.id, accessToken, guestId },
      });
      setOrder(updated);
      onDone();
    } finally {
      setLoading(false);
    }
  }

  const fsm = (order?.fsm_state ?? "CEO_INPUTED") as CeoOrderFsmState;
  const fsmMeta = CEO_FSM_META[fsm];

  return (
    <DrawerShell
      title="대표 일괄 지시"
      subtitle="FSM: CEO_INPUTED → RUNNING → WAITING_APPROVAL → COMPLETED"
      onClose={onClose}
      wide
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {(Object.keys(CEO_FSM_META) as CeoOrderFsmState[]).map((s) => (
          <span
            key={s}
            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
              s === fsm ? "ring-2 ring-offset-1" : "opacity-50"
            }`}
            style={{
              background: `${CEO_FSM_META[s].color}22`,
              color: CEO_FSM_META[s].color,
            }}
          >
            {CEO_FSM_META[s].label}
          </span>
        ))}
      </div>

      {!order ? (
        <>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder="전체 부서에 내릴 업무 지시… (예: 2분기 포트폴리오 리스크 점검 보고)"
            className="w-full rounded-xl border border-[#e5e8eb] px-3 py-2 text-sm"
          />
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={() => setMode("all")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === "all" ? "bg-[#3182f6] text-white" : "bg-[#f2f4f6]"
              }`}
            >
              전체 부서
            </button>
            <button
              type="button"
              onClick={() => setMode("selected")}
              className={`rounded-lg px-3 py-1 text-xs font-semibold ${
                mode === "selected" ? "bg-[#3182f6] text-white" : "bg-[#f2f4f6]"
              }`}
            >
              선택 부서
            </button>
          </div>
          {mode === "selected" && (
            <div className="mt-2 flex flex-wrap gap-1">
              {company.departments.map((d) => (
                <button
                  key={d.slug}
                  type="button"
                  onClick={() => toggleDept(d.slug)}
                  className={`rounded-lg px-2 py-1 text-[10px] font-semibold ${
                    selected.has(d.slug) ? "bg-[#3182f6] text-white" : "bg-[#f2f4f6]"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
          <button
            type="button"
            disabled={loading || !message.trim()}
            onClick={() => void dispatch()}
            className="mt-3 w-full rounded-xl bg-[#f59e0b] py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {loading ? "부서별 실행 중…" : "일괄 지시 실행"}
          </button>
        </>
      ) : (
        <div className="space-y-3">
          <p className="rounded-xl bg-[#f9fafb] p-3 text-sm">{order.message}</p>
          <p className="text-xs font-semibold" style={{ color: fsmMeta.color }}>
            현재 상태: {fsmMeta.label}
          </p>
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {(order.results ?? []).map((r) => (
              <div key={r.id} className="rounded-xl border border-[#f2f4f6] p-2">
                <p className="text-xs font-bold">{r.department_label}</p>
                {r.summary && <p className="text-[10px] text-[#3182f6]">{r.summary}</p>}
                {r.body && (
                  <p className="mt-1 line-clamp-3 text-[10px] text-[#6b7684]">{r.body}</p>
                )}
                {r.status === "failed" && (
                  <p className="text-[10px] text-[#ef4444]">{r.error_message}</p>
                )}
              </div>
            ))}
          </div>
          {order.fsm_state === "WAITING_APPROVAL" && (
            <>
              <button
                type="button"
                disabled={loading}
                onClick={() => void approve()}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#22c55e] py-2.5 text-sm font-bold text-white"
              >
                <CheckCircle2 className="size-4" />
                CEO 승인 · 보고서 보관함 저장
              </button>
              <button
                type="button"
                onClick={() => void exportCeoOrderZip(order)}
                className="mt-2 w-full rounded-xl border border-[#e5e8eb] py-2 text-xs font-semibold text-[#191f28]"
              >
                ZIP 번들 미리 다운로드 (승인 전)
              </button>
            </>
          )}
          {order.fsm_state === "COMPLETED" && (
            <>
              <p className="text-center text-xs text-[#22c55e]">
                승인 완료 — 보고서 보관함에서 확인하세요.
              </p>
              <button
                type="button"
                onClick={() => void exportCeoOrderZip(order)}
                className="w-full rounded-xl border border-[#3182f6]/30 bg-[#3182f6]/5 py-2 text-xs font-semibold text-[#3182f6]"
              >
                ZIP 아카이브 다운로드
              </button>
            </>
          )}
        </div>
      )}
    </DrawerShell>
  );
}

function DrawerShell({
  title,
  subtitle,
  onClose,
  children,
  wide,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
      <div
        className={`h-full w-full overflow-y-auto bg-white shadow-2xl ${wide ? "max-w-lg" : "max-w-md"}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 flex items-start justify-between border-b border-[#f2f4f6] bg-white p-4">
          <div>
            <h2 className="font-bold">{title}</h2>
            {subtitle && <p className="text-xs text-[#8b95a1]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 hover:bg-[#f2f4f6]">
            <X className="size-5" />
          </button>
        </div>
        <div className="p-4">{children}</div>
      </div>
    </div>
  );
}

void Download;
