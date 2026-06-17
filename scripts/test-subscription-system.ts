/**
 * Subscription system rules — run: npm run test:subscription-system
 */
import {
  PRIMARY_ADMIN_EMAIL,
  SUB_ADMIN_EMAIL,
  isStaffRole,
  resolveStaffRoleForEmail,
} from "../src/lib/auth/staff-roles.server.ts";
import { shouldDowngradeFromStripeStatus } from "../src/lib/billing/subscription-sync.server.ts";
import { membershipTierFor } from "../src/lib/membership/tiers.ts";
import type { AuthSession } from "../src/lib/types/auth.ts";

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

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

function main() {
  assert(resolveStaffRoleForEmail(PRIMARY_ADMIN_EMAIL) === "admin", "primary admin email");
  assert(resolveStaffRoleForEmail(SUB_ADMIN_EMAIL) === "sub_admin", "sub admin email");
  assert(resolveStaffRoleForEmail("other@example.com") === null, "regular user email");
  assert(isStaffRole("admin"), "admin is staff");
  assert(isStaffRole("sub_admin"), "sub_admin is staff");
  assert(!isStaffRole("user"), "user is not staff");

  const activeFree = session({ accountStatus: "active", plan: "free", subStatus: "inactive" });
  assert(membershipTierFor(activeFree) === "free", "Google signup default is free tier");

  const activePro = session({ accountStatus: "active", plan: "pro", subStatus: "active" });
  assert(membershipTierFor(activePro) === "day_trading", "paid pro maps to day_trading");

  const pastDuePro = session({ accountStatus: "active", plan: "pro", subStatus: "past_due" });
  assert(membershipTierFor(pastDuePro) === "free", "past_due subscription loses tier");

  const subAdminFree = session({
    accountStatus: "active",
    role: "sub_admin",
    plan: "free",
    subStatus: "inactive",
  });
  assert(membershipTierFor(subAdminFree) === "free", "sub_admin uses subscription tier only");

  const adminFree = session({
    accountStatus: "active",
    role: "admin",
    plan: "free",
    subStatus: "inactive",
  });
  assert(membershipTierFor(adminFree) === "elite", "admin always gets elite tier");

  assert(shouldDowngradeFromStripeStatus("canceled"), "canceled downgrades");
  assert(shouldDowngradeFromStripeStatus("past_due"), "past_due downgrades");
  assert(shouldDowngradeFromStripeStatus("unpaid"), "unpaid downgrades");
  assert(!shouldDowngradeFromStripeStatus("active"), "active stays paid");

  console.log("PASS: subscription system OK");
}

main();
