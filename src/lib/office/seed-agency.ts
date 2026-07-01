import agencyRaw from "@/data/agent-desk-agency.json";
import type { CompanyData, Department, Employee, OfficeEvent, Site } from "@/lib/office/types";

type AgencyDivision = {
  label: string;
  icon: string;
  color: string;
};

type AgencyAgent = {
  division: string;
  division_label: string;
  name: string;
  description: string;
  color: string;
  emoji: string;
  vibe: string;
  slug: string;
};

type AgencyFile = {
  divisions: Record<string, AgencyDivision>;
  agents: AgencyAgent[];
};

const agency = agencyRaw as AgencyFile;

const STATUSES: Employee["status"][] = [
  "working",
  "meeting",
  "review",
  "idle",
  "idle",
  "working",
];

const DEMO_SITES: Array<[string, string, string]> = [
  ["WallPilot Pro", "https://wallpilotpro.vercel.app", "technology"],
  ["Toss Trader", "https://wallpilotpro.vercel.app/toss-trader", "execution"],
  ["AI Pilot", "https://wallpilotpro.vercel.app/ai-pilot", "ai-pilot-desk"],
  ["Agent Desk", "https://wallpilotpro.vercel.app/agents/desk", "ai-pilot-desk"],
  ["Wall Report", "https://wallpilotpro.vercel.app/wall-street-report", "equity-research"],
];

let cachedBase: CompanyData | null = null;

export function buildSeedCompany(): CompanyData {
  if (cachedBase) return structuredClone(cachedBase);

  const departments: Department[] = Object.entries(agency.divisions).map(
    ([slug, meta], sort) => ({
      slug,
      label: meta.label,
      color: meta.color,
      icon: meta.icon,
      sort,
      real_member_name: null,
      has_real_avatar: false,
    }),
  );

  const employees: Employee[] = agency.agents.map((a, i) => {
    const status = STATUSES[i % STATUSES.length];
    return {
      id: i + 1,
      slug: a.slug,
      department_slug: a.division,
      name: a.name,
      description: a.description,
      color: a.color,
      emoji: a.emoji,
      vibe: a.vibe,
      status,
      current_task:
        status === "idle" ? null : `${a.division_label} 업무 처리 중`,
    };
  });

  const sites: Site[] = DEMO_SITES.map(([name, url, department_slug], i) => ({
    id: i + 1,
    name,
    url,
    department_slug,
    status: "unknown" as const,
    http_code: null,
    last_checked: null,
  }));

  const stats = {
    total: employees.length,
    working: employees.filter((e) => e.status === "working").length,
    meeting: employees.filter((e) => e.status === "meeting").length,
    idle: employees.filter((e) => e.status === "idle").length,
    departments: departments.length,
  };

  cachedBase = { departments, employees, sites, stats };
  return structuredClone(cachedBase);
}

export function buildSeedEvents(): OfficeEvent[] {
  const now = Date.now();
  return [
    {
      id: 1,
      ts: new Date(now - 120_000).toISOString(),
      actor: "시스템",
      message: "WallPilot Agent Desk 초기화 — 전 트레이딩 데스크 출근",
    },
    {
      id: 2,
      ts: new Date(now - 90_000).toISOString(),
      actor: "Trade Shield",
      message: "LogShield Control Tower — Site 6 check… High Risk 2",
    },
    {
      id: 3,
      ts: new Date(now - 60_000).toISOString(),
      actor: "Quant & Reverse-Quant",
      message: "Reverse-Quant 후보 3종목 스캔 완료",
    },
    {
      id: 4,
      ts: new Date(now - 30_000).toISOString(),
      actor: "AI Pilot Desk",
      message: "Gemini 분석 파이프라인 대기 중",
    },
  ];
}
