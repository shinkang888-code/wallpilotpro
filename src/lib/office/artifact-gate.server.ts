import type { OfficeChatResult } from "@/lib/office/types";

export class ArtifactGateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ArtifactGateError";
  }
}

/** Stage Artifact Gate — summary/body 필수 검증 */
export function assertChatArtifactGate(result: OfficeChatResult): void {
  if (!result.summary?.trim() && !result.body?.trim()) {
    throw new ArtifactGateError("artifact_gate_empty_response");
  }
  const combined = `${result.summary ?? ""}\n${result.body ?? ""}`.trim();
  if (combined.length < 10) {
    throw new ArtifactGateError("artifact_gate_body_too_short");
  }
}

export function assertReportBodyGate(body: string): void {
  if (!body?.trim() || body.trim().length < 20) {
    throw new ArtifactGateError("artifact_gate_report_too_short");
  }
}
