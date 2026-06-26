import { useCallback, useEffect, useState } from "react";

import type { AppLocale } from "@/lib/i18n/constants";

const STORAGE_KEY = "wallpilot-ai-pilot-quick-prompts";

export const DEFAULT_QUICK_PROMPTS_KO = [
  "미국주식중에 현시점 역설계 10가지 추천해줘 150달러미만",
  "역설계적으로 현금흐름 좋고 단기 상승가능한 주식 5개 국내주 찍어",
  "위 종목 중 단기 상승 가능한 순서로",
  "단기 회전율 높은 종목에 자금 집중 배분 가이드",
  "미국 AI 인프라 연동 국내 수혜주 3개",
];

export const DEFAULT_QUICK_PROMPTS_EN = [
  "Reverse-engineer 10 US stocks under $150 with strong upside now",
  "Pick 5 KR stocks with strong cash flow and near-term upside (reverse-quant)",
  "Rank those by short-term breakout timeline",
  "Aggressive vs conservative allocation guide",
  "3 KR beneficiaries of US AI infrastructure",
];

type PromptStore = { ko: string[]; en: string[] };

function readStore(): PromptStore {
  if (typeof window === "undefined") {
    return { ko: [...DEFAULT_QUICK_PROMPTS_KO], en: [...DEFAULT_QUICK_PROMPTS_EN] };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return { ko: [...DEFAULT_QUICK_PROMPTS_KO], en: [...DEFAULT_QUICK_PROMPTS_EN] };
    }
    const parsed = JSON.parse(raw) as Partial<PromptStore>;
    return {
      ko: Array.isArray(parsed.ko) && parsed.ko.length > 0 ? parsed.ko : [...DEFAULT_QUICK_PROMPTS_KO],
      en: Array.isArray(parsed.en) && parsed.en.length > 0 ? parsed.en : [...DEFAULT_QUICK_PROMPTS_EN],
    };
  } catch {
    return { ko: [...DEFAULT_QUICK_PROMPTS_KO], en: [...DEFAULT_QUICK_PROMPTS_EN] };
  }
}

function writeStore(store: PromptStore) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function useQuickPrompts(lang: AppLocale) {
  const [store, setStore] = useState<PromptStore>(() => readStore());

  useEffect(() => {
    setStore(readStore());
  }, []);

  const localeKey = lang === "ko" ? "ko" : "en";
  const prompts = store[localeKey];

  const persist = useCallback((next: PromptStore) => {
    writeStore(next);
    setStore(next);
  }, []);

  const addPrompt = useCallback(
    (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      persist({
        ...store,
        [localeKey]: [...store[localeKey], trimmed],
      });
    },
    [localeKey, persist, store],
  );

  const updatePrompt = useCallback(
    (index: number, text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const list = [...store[localeKey]];
      if (index < 0 || index >= list.length) return;
      list[index] = trimmed;
      persist({ ...store, [localeKey]: list });
    },
    [localeKey, persist, store],
  );

  const deletePrompt = useCallback(
    (index: number) => {
      const list = store[localeKey].filter((_, i) => i !== index);
      persist({ ...store, [localeKey]: list });
    },
    [localeKey, persist, store],
  );

  const resetToDefaults = useCallback(() => {
    persist({
      ...store,
      [localeKey]: localeKey === "ko" ? [...DEFAULT_QUICK_PROMPTS_KO] : [...DEFAULT_QUICK_PROMPTS_EN],
    });
  }, [localeKey, persist, store]);

  return { prompts, addPrompt, updatePrompt, deletePrompt, resetToDefaults, localeKey };
}
