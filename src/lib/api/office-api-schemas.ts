import { z } from "zod";

/** 빈 문자열·짧은 키는 undefined로 정규화 (Zod 검증 실패 방지) */
export const optionalGuestIdSchema = z.preprocess(
  (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
  z.string().uuid().optional(),
);

export const optionalGeminiKeySchema = z.object({
  geminiApiKey: z.preprocess(
    (v) => (typeof v === "string" && v.trim().length < 20 ? undefined : v),
    z.string().min(20).optional(),
  ),
});

export const officeContextSchema = z.object({
  accessToken: z.string().nullable().optional(),
  guestId: optionalGuestIdSchema,
});
