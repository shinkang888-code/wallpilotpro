import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { listAdminUsers, setUserAccountStatus, setUserPlanOverride, setUserRole, getAdminStats } from "@/lib/admin/users.server";
import { requireFullAdminSession, requireStaffSession } from "@/lib/auth/session.server";

const adminToken = z.object({
  accessToken: z.string().min(20),
});

export const adminListUsers = createServerFn({ method: "POST" })
  .inputValidator(
    adminToken.extend({
      statusFilter: z.enum(["pending", "active", "suspended"]).optional(),
    }),
  )
  .handler(async ({ data }) => {
    await requireStaffSession(data.accessToken);
    return listAdminUsers(data.statusFilter);
  });

export const adminApproveUser = createServerFn({ method: "POST" })
  .inputValidator(adminToken.extend({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireStaffSession(data.accessToken);
    return setUserAccountStatus(session.user.id, data.userId, "active");
  });

export const adminSuspendUser = createServerFn({ method: "POST" })
  .inputValidator(adminToken.extend({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireStaffSession(data.accessToken);
    return setUserAccountStatus(session.user.id, data.userId, "suspended");
  });

export const adminDeleteUser = createServerFn({ method: "POST" })
  .inputValidator(adminToken.extend({ userId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const session = await requireFullAdminSession(data.accessToken);
    return setUserAccountStatus(session.user.id, data.userId, "deleted");
  });

export const adminSetUserPlan = createServerFn({ method: "POST" })
  .inputValidator(
    adminToken.extend({
      userId: z.string().uuid(),
      plan: z.enum(["free", "basic", "pro", "premium", "elite"]),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireStaffSession(data.accessToken);
    return setUserPlanOverride(session.user.id, data.userId, data.plan);
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .inputValidator(
    adminToken.extend({
      userId: z.string().uuid(),
      role: z.enum(["user", "admin", "sub_admin"]),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireStaffSession(data.accessToken);
    return setUserRole(session.user.id, session.profile.role, data.userId, data.role);
  });

export const adminGetStats = createServerFn({ method: "POST" })
  .inputValidator(adminToken)
  .handler(async ({ data }) => {
    await requireStaffSession(data.accessToken);
    return getAdminStats();
  });
