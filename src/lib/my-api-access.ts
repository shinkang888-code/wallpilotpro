/** Platform API panels (Vercel / Supabase / Gemini / Google Auth) — owner only. */
export const MY_API_PLATFORM_OWNER_EMAIL = "shinkang888@gmail.com";

export function canManagePlatformApis(email: string | null | undefined): boolean {
  if (!email?.trim()) return false;
  return email.trim().toLowerCase() === MY_API_PLATFORM_OWNER_EMAIL.toLowerCase();
}
