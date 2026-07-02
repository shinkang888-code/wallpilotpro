import {
  Download,
  FileText,
  Loader2,
  Presentation,
  Send,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  exportChatDocument,
  type ExportFormat,
} from "@/lib/agent-desk/chat-document-export";
import type { ChatMessage } from "@/lib/agent-desk/chat-types";
import type { OfficeApiContext } from "@/lib/agent-desk/office-api-context";
import { postAgentDeskChat } from "@/lib/api/office.functions";
import { useI18n } from "@/lib/i18n";
import type { Department, Employee, OfficeEvent } from "@/lib/office/types";

type Props = OfficeApiContext & {
  leader: Employee;
  dept: Department;
  geminiApiKey?: string | null;
  onClose: () => void;
  onTaskStart?: (event: OfficeEvent) => void;
  onTaskEnd?: () => void;
};

function formatChatError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("artifact_gate")) {
    return "AI 응답이 보고서 기준에 미달합니다. 질문을 구체적으로 다시 입력해 주세요.";
  }
  if (msg.includes("office_actor_required")) {
    return "세션을 불러오지 못했습니다. 페이지를 새로고침 후 다시 시도해 주세요.";
  }
  if (msg.includes("GEMINI") || msg.includes("API")) {
    return msg;
  }
  return msg || "요청 처리에 실패했습니다.";
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("ko-KR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function makeId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

const EXPORT_BUTTONS: Array<{ format: ExportFormat; label: string; ext: string }> = [
  { format: "docx", label: "Word", ext: ".docx" },
  { format: "hwp", label: "HWP", ext: ".hwpx" },
  { format: "pptx", label: "PPT", ext: ".pptx" },
  { format: "pdf", label: "PDF", ext: ".pdf" },
  { format: "txt", label: "TXT", ext: ".txt" },
];

export function WorkChatSheet({
  leader,
  dept,
  accessToken,
  guestId,
  geminiApiKey,
  onClose,
  onTaskStart,
  onTaskEnd,
}: Props) {
  const { t } = useI18n();
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState<ExportFormat | null>(null);
  const [errorHint, setErrorHint] = useState<string | null>(null);
  const [llmInfo, setLlmInfo] = useState<{ vendor?: string; fallback?: boolean } | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastUserPromptRef = useRef("");
  const composingRef = useRef(false);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const latestAssistant = [...messages].reverse().find((m) => m.role === "assistant");

  async function send() {
    const text = message.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = {
      id: makeId(),
      role: "user",
      text,
      createdAt: Date.now(),
    };
    lastUserPromptRef.current = text;
    setMessages((prev) => [...prev, userMsg]);
    setMessage("");
    setErrorHint(null);
    setLoading(true);

    onTaskStart?.({
      id: -Date.now(),
      ts: new Date().toISOString(),
      actor: leader.name,
      message: `업무 지시: ${text.slice(0, 80)}`,
      kind: "task",
      progress_pct: 20,
      task_status: "running",
      department_slug: dept.slug,
      employee_slug: leader.slug,
    });

    const history = messages.map((m) => ({
      role: m.role,
      content: m.role === "assistant" && m.summary ? `${m.summary}\n\n${m.text}` : m.text,
    }));

    try {
      const res = await postAgentDeskChat({
        data: {
          message: text,
          deptLabel: dept.label,
          deptSlug: dept.slug,
          role: leader.description ?? leader.name,
          employeeSlug: leader.slug,
          employeeName: leader.name,
          persona: {
            employeeName: leader.name,
            deptMission: dept.mission,
            vibe: leader.vibe,
            constitutionRole: leader.constitution_role ?? undefined,
            constitutionPrompt: leader.constitution_prompt,
          },
          history,
          accessToken,
          guestId,
          geminiApiKey: geminiApiKey ?? undefined,
        },
      });

      const assistantMsg: ChatMessage = {
        id: makeId(),
        role: "assistant",
        text: res.body,
        summary: res.summary,
        links: res.links,
        createdAt: Date.now(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      setLlmInfo({
        vendor: res.llm_vendor ?? undefined,
        fallback: res.llm_fallback,
      });
      onTaskEnd?.();
    } catch (err) {
      const hint = formatChatError(err);
      setErrorHint(hint);
      setMessages((prev) => [
        ...prev,
        {
          id: makeId(),
          role: "assistant",
          text: hint,
          createdAt: Date.now(),
        },
      ]);
      onTaskEnd?.();
    } finally {
      setLoading(false);
    }
  }

  async function handleExport(format: ExportFormat) {
    if (!latestAssistant || exporting) return;
    setExporting(format);
    try {
      await exportChatDocument(format, {
        title: `${dept.label} 업무보고`,
        deptLabel: dept.label,
        leaderName: leader.name,
        summary: latestAssistant.summary ?? "",
        body: latestAssistant.text,
        userPrompt: lastUserPromptRef.current,
        links: latestAssistant.links,
      });
    } finally {
      setExporting(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="ad-kakao-chat flex h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl bg-[#b2c7d9] shadow-2xl sm:h-[85vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex shrink-0 items-center gap-3 border-b border-[#9eb4c8] bg-[#3182f6] px-4 py-3 text-white"
        >
          <span className="text-2xl">{leader.emoji ?? "🤖"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-blue-100">{dept.label}</p>
            <h2 className="truncate font-bold">{leader.name}</h2>
            {llmInfo?.vendor && (
              <p className="text-[10px] text-blue-200">
                {llmInfo.vendor === "openai" ? "OpenAI" : "Gemini"}
                {llmInfo.fallback ? " (폴백)" : " Primary"}
              </p>
            )}
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-white/15">
            <X className="size-5" />
          </button>
        </header>

        {latestAssistant && (
          <div className="shrink-0 border-b border-[#9eb4c8] bg-[#a8bccf] px-3 py-2">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[#4a5f73]">
              {t("agent_desk_chat_export")}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_BUTTONS.map(({ format, label, ext }) => (
                <button
                  key={format}
                  type="button"
                  disabled={!!exporting}
                  onClick={() => void handleExport(format)}
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-xs font-semibold text-[#191f28] shadow-sm transition hover:bg-[#f9fafb] disabled:opacity-50"
                >
                  {exporting === format ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : format === "pptx" ? (
                    <Presentation className="size-3 text-[#f59e0b]" />
                  ) : (
                    <FileText className="size-3 text-[#3182f6]" />
                  )}
                  {label}
                  <span className="text-[10px] font-normal text-[#8b95a1]">{ext}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-3 py-4">
          {messages.length === 0 && !loading && (
            <div className="flex justify-center">
              <p className="rounded-2xl bg-black/10 px-4 py-2 text-center text-xs text-[#4a5f73]">
                {t("agent_desk_chat_hint")}
              </p>
            </div>
          )}

          {messages.map((msg) =>
            msg.role === "user" ? (
              <div key={msg.id} className="flex justify-end gap-2">
                <div className="flex flex-col items-end">
                  <div className="ad-kakao-bubble-user max-w-[85%] rounded-2xl rounded-tr-sm bg-[#fee500] px-3.5 py-2.5 text-sm text-[#191f28] shadow-sm">
                    {msg.text}
                  </div>
                  <span className="mt-1 text-[10px] text-[#6b7f93]">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            ) : (
              <div key={msg.id} className="flex gap-2">
                <span className="mt-1 flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                  {leader.emoji ?? "🤖"}
                </span>
                <div className="min-w-0 flex-1">
                  {msg.summary && (
                    <p className="mb-1 text-xs font-semibold text-[#3182f6]">{msg.summary}</p>
                  )}
                  <div className="ad-kakao-bubble-bot max-w-[92%] rounded-2xl rounded-tl-sm bg-white px-3.5 py-2.5 text-sm text-[#191f28] shadow-sm">
                    <div className="prose prose-sm max-w-none text-[#191f28]">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
                    </div>
                    {msg.links && msg.links.length > 0 && (
                      <ul className="mt-2 space-y-1 border-t border-[#f2f4f6] pt-2 text-xs">
                        {msg.links.map((link) => (
                          <li key={link.url}>
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[#3182f6] underline"
                            >
                              {link.label}
                            </a>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <span className="mt-1 block text-[10px] text-[#6b7f93]">{formatTime(msg.createdAt)}</span>
                </div>
              </div>
            ),
          )}

          {loading && (
            <div className="flex gap-2">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white text-lg shadow-sm">
                {leader.emoji ?? "🤖"}
              </span>
              <div className="ad-kakao-bubble-bot flex items-center gap-2 rounded-2xl rounded-tl-sm bg-white px-4 py-3 text-sm text-[#8b95a1] shadow-sm">
                <Loader2 className="size-4 animate-spin text-[#3182f6]" />
                {t("agent_desk_chat_typing")}
              </div>
            </div>
          )}
        </div>

        <footer className="shrink-0 border-t border-[#9eb4c8] bg-white p-3">
          <div className="flex items-end gap-2">
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onCompositionStart={() => {
                composingRef.current = true;
              }}
              onCompositionEnd={() => {
                composingRef.current = false;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && !composingRef.current) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              autoFocus
              placeholder={t("agent_desk_chat_placeholder")}
              className="max-h-28 min-h-[44px] min-w-0 flex-1 resize-none rounded-2xl border border-[#e5e8eb] bg-[#f9fafb] px-4 py-2.5 text-sm outline-none ring-[#3182f6] focus:bg-white focus:ring-2"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !message.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-full bg-[#3182f6] text-white shadow-md transition hover:bg-[#1b64da] disabled:opacity-50"
              aria-label={t("agent_desk_chat_send")}
            >
              <Send className="size-4" />
            </button>
          </div>
          {errorHint && (
            <p className="mt-2 rounded-lg bg-red-50 px-2 py-1 text-[10px] text-red-700">{errorHint}</p>
          )}
          {latestAssistant && !errorHint && (
            <p className="mt-2 flex items-center gap-1 text-[10px] text-[#8b95a1]">
              <Download className="size-3" />
              {t("agent_desk_chat_export_hint")}
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}
