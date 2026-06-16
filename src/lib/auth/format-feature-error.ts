/** Map server auth/entitlement errors to user-facing copy. */
export function formatFeatureError(message: string, t: (key: string) => string): string {
  if (message === "unauthorized") return t("auth_sign_in_first");
  if (message === "auth_not_configured") return t("auth_err_not_configured");
  if (message === "missing_service_role") return t("auth_err_missing_service_role");
  if (message === "missing_anon_key") return t("auth_err_missing_anon_key");
  if (message === "account_pending") return t("auth_notice_pending");
  if (message === "account_suspended") return t("auth_err_suspended");
  if (message === "account_deleted") return t("auth_err_deleted");
  if (message === "account_blocked") return t("auth_err_blocked");
  if (message.startsWith("entitlement_required:")) {
    const feature = message.split(":")[1] ?? "";
    if (feature === "scan") return t("auth_err_need_basic");
    if (feature === "wall_report") return t("auth_err_need_pro");
    if (feature === "dart_lab") return t("auth_err_need_pro");
    if (feature === "agent_desk" || feature === "ai_pilot" || feature === "pdf_export")
      return t("auth_err_need_premium");
    if (feature === "rl_lab" || feature === "toss_execute") return t("auth_notice_upgrade");
    return t("auth_notice_upgrade");
  }
  if (message === "agent_desk_failed" || message.includes("timeout") || message.includes("timed out")) {
    return t("agent_desk_timeout");
  }
  if (message === "opendart_not_configured") return t("dart_opendart_hint");
  if (message === "dart_corp_not_found") return t("dart_invalid_code");
  if (message === "dart_failed" || message === "dart_invalid_stock_code") return t("dart_invalid_code");
  if (message === "Market data unavailable") return t("agent_desk_failed");
  return message;
}
