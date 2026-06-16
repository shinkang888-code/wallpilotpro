export type AccountStatus = "pending" | "active" | "suspended" | "deleted";
export type UserRole = "user" | "admin";
export type SubscriptionPlan = "free" | "basic" | "pro" | "premium" | "elite";
export type SubscriptionStatus = "inactive" | "trialing" | "active" | "past_due" | "canceled";

export type UserProfile = {
  id: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  accountStatus: AccountStatus;
  role: UserRole;
  createdAt: string;
  approvedAt: string | null;
};

export type UserSubscription = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  currentPeriodEnd: string | null;
};

export type AuthUser = {
  id: string;
  email: string;
};

export type AuthSession = {
  user: AuthUser;
  profile: UserProfile;
  subscription: UserSubscription;
  accessToken: string;
};

export type EntitlementFeature =
  | "scan"
  | "scan_preview"
  | "chart"
  | "strategy_advice"
  | "ai_pilot"
  | "wall_report"
  | "toss_execute"
  | "agent_desk"
  | "signals_read"
  | "signals_write"
  | "rl_lab"
  | "dart_lab"
  | "pdf_export";

export type ActivityEventType =
  | "login"
  | "logout"
  | "page_view"
  | "feature_execute"
  | "pdf_export"
  | "menu_denied";

export type MenuTierPermissionRow = {
  menuId: string;
  tier: string;
  canView: boolean;
  canExecute: boolean;
  canExportPdf: boolean;
};

export type UserActivityRow = {
  id: string;
  userId: string | null;
  eventType: ActivityEventType;
  menuId: string | null;
  detail: Record<string, string | number | boolean | null>;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  userEmail?: string | null;
};

export type AdminUserRow = UserProfile & {
  subscription: UserSubscription;
};
