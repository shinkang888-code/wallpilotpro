import type { Employee, OfficeEvent, Site } from "@/lib/office/types";

export type DeptReport = {
  hasReport: boolean;
  items: string[];
  leader: Employee | null;
};

const LEADER_CHITCHAT = [
  "팀 분위기 좋네요! 커피 한잔 어때요? ☕",
  "오늘도 화이팅입니다~ 💪",
  "잠깐 스탠드업 미팅 할까요?",
  "주간 목표 거의 달성했어요 ✨",
  "신규 업무 들어왔는데 검토 부탁드려요!",
  "점심 메뉴 추천해 주세요 🍱",
  "코드 리뷰 시간 잡을게요 👀",
  "금요일엔 조기 퇴근 어때요? 😄",
];

export function getTeamLeader(deptSlug: string, employees: Employee[]): Employee | null {
  const dept = employees
    .filter((e) => e.department_slug === deptSlug)
    .sort((a, b) => a.id - b.id);
  return dept[0] ?? null;
}

export function buildDeptReport(
  deptSlug: string,
  employees: Employee[],
  sites: Site[],
  events: OfficeEvent[],
): DeptReport {
  const leader = getTeamLeader(deptSlug, employees);
  const deptEmps = employees.filter((e) => e.department_slug === deptSlug);
  const items: string[] = [];

  const downSites = sites.filter((s) => s.department_slug === deptSlug && s.status === "down");
  if (downSites.length) {
    items.push(`담당 사이트 장애: ${downSites.map((s) => s.name).join(", ")}`);
  }

  const errorEmps = deptEmps.filter((e) => e.status === "error");
  if (errorEmps.length) {
    items.push(`팀원 장애 대응: ${errorEmps.map((e) => e.name).join(", ")}`);
  }

  const reviewBacklog = deptEmps.filter((e) => e.status === "review" && e.current_task);
  if (reviewBacklog.length >= 2) {
    items.push(`검토 대기 ${reviewBacklog.length}건 — 우선 확인 필요`);
  }

  const deptNames = new Set(deptEmps.map((e) => e.name));
  const urgentEvents = events.filter(
    (ev) =>
      ev.message.includes("장애") ||
      ev.message.includes("고위험") ||
      ev.message.toLowerCase().includes("down"),
  );
  for (const ev of urgentEvents.slice(0, 3)) {
    if (ev.actor && deptNames.has(ev.actor)) {
      items.push(`최근 알림: ${ev.actor} — ${ev.message}`);
      break;
    }
  }

  const meetingCount = deptEmps.filter((e) => e.status === "meeting").length;
  if (meetingCount >= 2) {
    items.push(`회의 중인 팀원 ${meetingCount}명 — 일정 조율 필요`);
  }

  return { hasReport: items.length > 0, items, leader };
}

export function leaderChitchat(leader: Employee): string {
  return LEADER_CHITCHAT[leader.id % LEADER_CHITCHAT.length];
}
