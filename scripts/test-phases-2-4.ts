/**
 * WallPilot Pro Phase 2–4 module verification.
 */
import assert from "node:assert/strict";

import { listRlPresets } from "../src/lib/modules/tm/rl-lab.server";
import { canAccessMenu } from "../src/lib/membership/menu-access";
import { APP_MENUS } from "../src/lib/membership/menus";
import { canAccess } from "../src/lib/auth/entitlements.server";
import type { AuthSession } from "../src/lib/types/auth";

function mockSession(plan: AuthSession["subscription"]["plan"]): AuthSession {
  return {
    user: { id: "u1", email: "test@example.com" },
    profile: {
      id: "u1",
      email: "test@example.com",
      displayName: "Test",
      avatarUrl: null,
      accountStatus: "active",
      role: "user",
      createdAt: new Date().toISOString(),
      approvedAt: new Date().toISOString(),
    },
    subscription: { plan, status: "active", currentPeriodEnd: null },
    accessToken: "token",
  };
}

console.log("WallPilot Pro P2–P4 tests\n");

// Extension menus in top nav
const ext = APP_MENUS.filter((m) => m.namespace);
assert.equal(ext.length, 4);
assert.deepEqual(
  ext.map((m) => m.namespace),
  ["dart", "ta", "ait", "tm"],
);

// Phase 2 — Agent Desk (premium+)
assert.equal(canAccessMenu("agent_desk", "day_trading", "execute"), false);
assert.equal(canAccessMenu("agent_desk", "premium", "execute"), true);
assert.equal(canAccess(mockSession("premium"), "agent_desk"), true);
assert.equal(canAccess(mockSession("pro"), "agent_desk"), false);

// Phase 3 — Signal Hub read (free) / write (pro+)
assert.equal(canAccessMenu("signal_hub", "free", "view"), true);
assert.equal(canAccess(mockSession("free"), "signals_read"), true);
assert.equal(canAccess(mockSession("free"), "signals_write"), false);
assert.equal(canAccess(mockSession("pro"), "signals_write"), true);

// Phase 4 — RL Lab (elite)
assert.equal(canAccessMenu("rl_lab", "elite", "execute"), true);
assert.equal(canAccess(mockSession("elite"), "rl_lab"), true);
assert.equal(canAccess(mockSession("premium"), "rl_lab"), false);

// RL presets
const presets = await listRlPresets();
assert.ok(presets.tasks.length >= 2);
assert.ok(presets.agents.length >= 2);

console.log("✓ All Phase 2–4 checks passed");
