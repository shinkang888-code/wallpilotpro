/**
 * WallPilot Pro Phase 1 verification — membership tiers, menu access, entitlements.
 */
import assert from "node:assert/strict";

import { canAccessMenu, visibleMenusForTier } from "../src/lib/membership/menu-access";
import { APP_MENUS } from "../src/lib/membership/menus";
import { membershipTierFromPlan, MEMBERSHIP_TIERS } from "../src/lib/membership/tiers";
import { canAccess } from "../src/lib/auth/entitlements.server";
import type { AuthSession } from "../src/lib/types/auth";

function mockSession(plan: AuthSession["subscription"]["plan"], role: "user" | "admin" = "user"): AuthSession {
  return {
    user: { id: "u1", email: "test@example.com" },
    profile: {
      id: "u1",
      email: "test@example.com",
      displayName: "Test",
      avatarUrl: null,
      accountStatus: "active",
      role,
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    },
    subscription: { plan, status: "active", currentPeriodEnd: null },
    accessToken: "token",
  };
}

console.log("WallPilot Pro P1 tests\n");

// 4 tiers defined
assert.equal(MEMBERSHIP_TIERS.length, 4);
assert.deepEqual(
  MEMBERSHIP_TIERS.map((t) => t.id),
  ["free", "day_trading", "premium", "elite"],
);

// Plan mapping
assert.equal(membershipTierFromPlan("free"), "free");
assert.equal(membershipTierFromPlan("pro"), "day_trading");
assert.equal(membershipTierFromPlan("premium"), "premium");
assert.equal(membershipTierFromPlan("elite"), "elite");

// Free user cannot execute AI Pilot menu
assert.equal(canAccessMenu("ai_pilot", "free", "execute"), false);
assert.equal(canAccessMenu("ai_pilot", "premium", "execute"), true);
assert.equal(canAccessMenu("rl_lab", "premium", "execute"), false);
assert.equal(canAccessMenu("rl_lab", "elite", "execute"), true);

// Visible menus
const freeMenus = visibleMenusForTier("free");
assert.ok(freeMenus.includes("scanner"));
assert.ok(freeMenus.includes("signal_hub"));
assert.ok(!freeMenus.includes("rl_lab"));

const eliteMenus = visibleMenusForTier("elite");
assert.ok(eliteMenus.includes("rl_lab"));
assert.ok(eliteMenus.includes("agent_desk"));

// Entitlements
const freeSession = mockSession("free");
const proSession = mockSession("pro");
const premiumSession = mockSession("premium");
const eliteSession = mockSession("elite");

assert.equal(canAccess(freeSession, "scan"), false);
assert.equal(canAccess(freeSession, "scan_preview"), true);
assert.equal(canAccess(proSession, "scan"), true);
assert.equal(canAccess(proSession, "ai_pilot"), false);
assert.equal(canAccess(premiumSession, "ai_pilot"), true);
assert.equal(canAccess(premiumSession, "toss_execute"), false);
assert.equal(canAccess(eliteSession, "toss_execute"), true);
assert.equal(canAccess(eliteSession, "rl_lab"), true);

// All extension menus registered
assert.equal(APP_MENUS.filter((m) => m.namespace).length, 3);

console.log("✓ All Phase 1 checks passed");
