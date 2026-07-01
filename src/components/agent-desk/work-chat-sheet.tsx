import { Loader2, Send, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { postAgentDeskChat } from "@/lib/api/office.functions";
import type { Department, Employee } from "@/lib/office/types";

type Props = {
  leader: Employee;
  dept: Department;
  accessToken: string | null;
  geminiApiKey?: string | null;
  onClose: () => void;
};

export function WorkChatSheet({ leader, dept, accessToken, geminiApiKey, onClose }: Props) {
  const [message, setMessage] = useState("");
  const [summary, setSummary] = useState("");
  const [body, setBody] = useState("");
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!message.trim() || loading) return;
    setLoading(true);
    try {
      const res = await postAgentDeskChat({
        data: {
          message: message.trim(),
          deptLabel: dept.label,
          role: leader.description ?? leader.name,
          accessToken,
          geminiApiKey: geminiApiKey ?? null,
        },
      });
      setSummary(res.summary);
      setBody(res.body);
      setMessage("");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex h-[85vh] w-full max-w-md flex-col rounded-t-2xl bg-white shadow-2xl sm:h-auto sm:max-h-[80vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header
          className="flex items-center gap-3 border-b border-[#f2f4f6] px-4 py-3"
          style={{ borderTop: `4px solid ${dept.color}` }}
        >
          <span className="text-2xl">{leader.emoji ?? "🤖"}</span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-[#3182f6]">{dept.label}</p>
            <h2 className="truncate font-bold text-[#191f28]">{leader.name}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 hover:bg-[#f2f4f6]">
            <X className="size-5 text-[#8b95a1]" />
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
          {!body && !loading && (
            <p className="rounded-xl bg-[#f9fafb] px-3 py-4 text-sm text-[#6b7684]">
              업무 지시·질문을 입력하면 AI 팀장이 Gemini로 답변합니다.
            </p>
          )}
          {summary && (
            <p className="rounded-xl bg-[#3182f6]/10 px-3 py-2 text-sm font-semibold text-[#3182f6]">
              {summary}
            </p>
          )}
          {body && (
            <div className="prose prose-sm max-w-none rounded-xl border border-[#f2f4f6] bg-white p-3 text-[#191f28]">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
            </div>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-[#8b95a1]">
              <Loader2 className="size-4 animate-spin" />
              분석 중…
            </div>
          )}
        </div>

        <footer className="border-t border-[#f2f4f6] p-3">
          <div className="flex gap-2">
            <input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && void send()}
              placeholder="업무 지시 또는 질문…"
              className="min-w-0 flex-1 rounded-xl border border-[#e5e8eb] px-3 py-2.5 text-sm outline-none ring-[#3182f6] focus:ring-2"
            />
            <button
              type="button"
              onClick={() => void send()}
              disabled={loading || !message.trim()}
              className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-[#3182f6] text-white disabled:opacity-50"
            >
              <Send className="size-4" />
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
