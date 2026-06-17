import type { UserRole } from "@/lib/types/auth";
import { getServerConfig } from "@/lib/config.server";

export const PRIMARY_ADMIN_EMAIL = "shinkang888@gmail.com";
export const SUB_ADMIN_EMAIL = "kangjunchul8@gmail.com";

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function resolveStaffRoleForEmail(email: string): UserRole | null {
  const normalized = normalizeEmail(email);
  const { bootstrapAdminEmail } = getServerConfig();
  if (
    normalized === normalizeEmail(PRIMARY_ADMIN_EMAIL) ||
    (bootstrapAdminEmail && normalized === normalizeEmail(bootstrapAdminEmail))
  ) {
    return "admin";
  }
  if (normalized === normalizeEmail(SUB_ADMIN_EMAIL)) return "sub_admin";
  return null;
}

export function isStaffRole(role: UserRole): boolean {
  return role === "admin" || role === "sub_admin";
}

export function isFullAdminRole(role: UserRole): boolean {
  return role === "admin";
}
