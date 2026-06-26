import { useState } from "react";
import { ListPlus, Pencil, Plus, RotateCcw, Trash2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prompts: string[];
  onAdd: (text: string) => void;
  onUpdate: (index: number, text: string) => void;
  onDelete: (index: number) => void;
  onReset: () => void;
};

export function AiPilotQuickPromptsDialog({
  open,
  onOpenChange,
  prompts,
  onAdd,
  onUpdate,
  onDelete,
  onReset,
}: Props) {
  const { t } = useI18n();
  const [draft, setDraft] = useState("");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editDraft, setEditDraft] = useState("");

  const handleAdd = () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    onAdd(trimmed);
    setDraft("");
  };

  const startEdit = (index: number) => {
    setEditingIndex(index);
    setEditDraft(prompts[index] ?? "");
  };

  const saveEdit = () => {
    if (editingIndex == null) return;
    onUpdate(editingIndex, editDraft);
    setEditingIndex(null);
    setEditDraft("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden sm:rounded-2xl">
        <DialogHeader>
          <DialogTitle className="font-display">{t("pilot_prompts_dialog_title")}</DialogTitle>
          <DialogDescription>{t("pilot_prompts_dialog_sub")}</DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder={t("pilot_prompts_placeholder")}
            className="min-w-0 flex-1 rounded-xl border border-hairline bg-white px-3 py-2.5 text-sm focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!draft.trim()}
            className="inline-flex shrink-0 items-center gap-1 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            {t("pilot_prompts_add")}
          </button>
        </div>

        <div className="max-h-[min(50vh,360px)] space-y-2 overflow-y-auto pr-1">
          {prompts.length === 0 ? (
            <p className="rounded-xl border border-dashed border-hairline py-8 text-center text-sm text-muted-foreground">
              {t("pilot_prompts_empty")}
            </p>
          ) : (
            prompts.map((q, index) => (
              <div
                key={`${index}-${q.slice(0, 12)}`}
                className="rounded-xl border border-hairline bg-white p-3"
              >
                {editingIndex === index ? (
                  <div className="space-y-2">
                    <textarea
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      rows={3}
                      className="w-full rounded-lg border border-hairline px-3 py-2 text-sm focus:border-primary/40 focus:outline-none focus:ring-4 focus:ring-primary/10"
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setEditingIndex(null)}
                        className="rounded-lg border border-hairline px-3 py-1.5 text-xs font-medium text-muted-foreground"
                      >
                        {t("pilot_prompts_cancel")}
                      </button>
                      <button
                        type="button"
                        onClick={saveEdit}
                        disabled={!editDraft.trim()}
                        className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-50"
                      >
                        {t("pilot_prompts_save")}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <ListPlus className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <p className="min-w-0 flex-1 text-sm leading-relaxed text-foreground">{q}</p>
                    <div className="flex shrink-0 gap-1">
                      <button
                        type="button"
                        onClick={() => startEdit(index)}
                        className={cn(
                          "rounded-lg p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground",
                        )}
                        aria-label={t("pilot_prompts_edit")}
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(index)}
                        className="rounded-lg p-1.5 text-muted-foreground transition hover:bg-red-50 hover:text-destructive"
                        aria-label={t("pilot_prompts_delete")}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end border-t border-hairline pt-3">
          <button
            type="button"
            onClick={onReset}
            className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {t("pilot_prompts_reset")}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
