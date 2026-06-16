import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import {
  loadMenuPermissions,
  saveMenuPermissions,
  menuPermissionSummary,
} from "@/lib/db/menu-permissions.server";
import { requireAdminSession } from "@/lib/auth/session.server";

export const adminGetMenuPermissions = createServerFn({ method: "POST" })
  .inputValidator(z.object({ accessToken: z.string().min(20) }))
  .handler(async ({ data }) => {
    await requireAdminSession(data.accessToken);
    const [permissions, menus] = await Promise.all([loadMenuPermissions(), Promise.resolve(menuPermissionSummary())]);
    return { permissions, menus };
  });

export const adminSaveMenuPermissions = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      accessToken: z.string().min(20),
      permissions: z.array(
        z.object({
          menuId: z.string(),
          tier: z.enum(["free", "day_trading", "premium", "elite"]),
          canView: z.boolean(),
          canExecute: z.boolean(),
          canExportPdf: z.boolean(),
        }),
      ),
    }),
  )
  .handler(async ({ data }) => {
    const session = await requireAdminSession(data.accessToken);
    return saveMenuPermissions(
      session.user.id,
      data.permissions as import("@/lib/membership/menu-access").MenuTierPermission[],
    );
  });
