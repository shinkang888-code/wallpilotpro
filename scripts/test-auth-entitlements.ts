/**
 * Auth entitlement rules — run: npx tsx scripts/test-auth-entitlements.ts
 */
import { canAccess, entitlementsFor } from "../src/lib/auth/entitlements.server.ts";
import type { AuthSession } from "../src/lib/types/auth.ts";

function session(partial: {
  accountStatus: AuthSession["profile"]["accountStatus"];
  role?: AuthSession["profile"]["role"];
  plan?: AuthSession["subscription"]["plan"];
  subStatus?: AuthSession["subscription"]["status"];
}): AuthSession {
  return {
    user: { id: "u1", email: "test@example.com" },
    accessToken: "token",
    profile: {
      id: "u1",
      email: "test@example.com",
      displayName: null,
      avatarUrl: null,
      accountStatus: partial.accountStatus,
      role: partial.role ?? "user",
      createdAt: new Date().toISOString(),
      approvedAt: null,
    },
    subscription: {
      plan: partial.plan ?? "free",
      status: partial.subStatus ?? "inactive",
      currentPeriodEnd: null,
    },
  };
}

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

function main() {
  const pending = session({ accountStatus: "pending" });
  assert(!canAccess(pending, "scan"), "pending user must not scan");

  const activeFree = session({ accountStatus: "active", plan: "free", subStatus: "inactive" });
  assert(!canAccess(activeFree, "scan"), "active free user must not scan");
  assert(!canAccess(activeFree, "wall_report"), "active free user must not wall report");

  const activeBasic = session({ accountStatus: "active", plan: "basic", subStatus: "active" });
  assert(canAccess(activeBasic, "scan"), "legacy basic user must scan (mapped to pro)");
  assert(canAccess(activeBasic, "wall_report"), "legacy basic user gets pro entitlements");

  const activePro = session({ accountStatus: "active", plan: "pro", subStatus: "active" });
  assert(canAccess(activePro, "scan"), "pro user must scan");
  assert(canAccess(activePro, "wall_report"), "pro user must wall report");

  const adminFree = session({
    accountStatus: "active",
    role: "admin",
    plan: "free",
    subStatus: "inactive",
  });
  assert(canAccess(adminFree, "scan"), "admin must scan without plan");
  assert(canAccess(adminFree, "wall_report"), "admin must wall report without plan");
  assert(entitlementsFor(adminFree).toss_execute, "admin gets all entitlements");

  console.log("PASS: auth entitlements OK");
}

main();
