export type CaseStatus = "ok" | "timeout" | "forbidden" | "error" | "skipped";
export type BenchRole = "quan_ly" | "thu_kho";

export type Summary = {
  n: number;
  p50: number | null;
  p95: number | null;
  max: number | null;
  mean: number | null;
};

export type BenchCaseResult = {
  id: string;
  rpc: string;
  role: BenchRole;
  params: unknown;
  status: CaseStatus;
  samplesMs: number[];
  rows: number | null;
  error?: { code?: string; message: string };
  summary: Summary;
};

export type BenchRun = {
  label: string;
  createdAt: string;
  gitSha: string;
  latestMigration: string;
  iterations: number;
  scale: Record<string, number>;
  cases: BenchCaseResult[];
};

export type CompareRow = {
  id: string;
  role: string;
  a: BenchCaseResult | null;
  b: BenchCaseResult | null;
  deltaP50Pct: number | null;
  deltaP95Pct: number | null;
};

const TIMEOUT_LABEL = "timeout (8s)";
const MISSING = "—";

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

/** Nearest-rank: phần tử thứ ceil(q·n) của mảng đã sắp xếp. */
function nearestRank(sorted: number[], q: number): number {
  const index = Math.max(1, Math.ceil(q * sorted.length)) - 1;
  return sorted[index] ?? 0;
}

export function summarize(samplesMs: number[]): Summary {
  if (samplesMs.length === 0) {
    return { n: 0, p50: null, p95: null, max: null, mean: null };
  }
  const sorted = [...samplesMs].sort((x, y) => x - y);
  const sum = sorted.reduce((acc, v) => acc + v, 0);
  return {
    n: sorted.length,
    p50: round1(nearestRank(sorted, 0.5)),
    p95: round1(nearestRank(sorted, 0.95)),
    max: round1(sorted[sorted.length - 1] ?? 0),
    mean: round1(sum / sorted.length),
  };
}

function formatMs(value: number | null): string {
  return value === null ? MISSING : String(value);
}

function formatCell(result: BenchCaseResult | null, value: number | null): string {
  if (result === null) return MISSING;
  if (result.status === "timeout") return TIMEOUT_LABEL;
  if (result.status === "skipped") return "skipped";
  if (result.status === "forbidden") return "forbidden";
  if (result.status === "error") return "error";
  return formatMs(value);
}

function formatScale(scale: Record<string, number>): string {
  return Object.entries(scale)
    .map(([table, count]) => `${table}=${count}`)
    .join(", ");
}

export function renderRunMarkdown(run: BenchRun): string {
  const lines: string[] = [
    `# Bench ${run.label}`,
    "",
    `- Thời điểm: ${run.createdAt}`,
    `- Commit: ${run.gitSha} · migration mới nhất: ${run.latestMigration}`,
    `- Số lượt đo mỗi ca: ${run.iterations} (không tính 1 lượt làm nóng)`,
    "",
    "## Quy mô dữ liệu",
    "",
    "| Bảng | Số dòng |",
    "|---|---|",
    ...Object.entries(run.scale).map(([table, count]) => `| ${table} | ${count} |`),
    "",
    "## Kết quả (ms)",
    "",
    "| Ca | Vai trò | Trạng thái | p50 | p95 | max | Số dòng |",
    "|---|---|---|---|---|---|---|",
  ];
  for (const c of run.cases) {
    const detail = c.error?.code ? `${c.status} (${c.error.code})` : c.status;
    lines.push(
      `| ${c.id} | ${c.role} | ${detail} | ${formatMs(c.summary.p50)} | ${formatMs(c.summary.p95)} | ${formatMs(c.summary.max)} | ${c.rows ?? MISSING} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

function caseKey(c: BenchCaseResult): string {
  return `${c.id}|${c.role}`;
}

function deltaPct(before: number | null, after: number | null): number | null {
  if (before === null || after === null || before === 0) return null;
  return round1(((after - before) / before) * 100);
}

export function compareRuns(a: BenchRun, b: BenchRun): CompareRow[] {
  const byKeyA = new Map(a.cases.map((c) => [caseKey(c), c]));
  const byKeyB = new Map(b.cases.map((c) => [caseKey(c), c]));
  const keys = [...new Set([...byKeyA.keys(), ...byKeyB.keys()])];
  return keys.map((key) => {
    const caseA = byKeyA.get(key) ?? null;
    const caseB = byKeyB.get(key) ?? null;
    const [id = "", role = ""] = key.split("|");
    return {
      id,
      role,
      a: caseA,
      b: caseB,
      deltaP50Pct: deltaPct(caseA?.summary.p50 ?? null, caseB?.summary.p50 ?? null),
      deltaP95Pct: deltaPct(caseA?.summary.p95 ?? null, caseB?.summary.p95 ?? null),
    };
  });
}

function formatDelta(value: number | null): string {
  if (value === null) return MISSING;
  return `${value > 0 ? "+" : ""}${value}%`;
}

export function renderCompareMarkdown(
  rows: CompareRow[],
  a: BenchRun,
  b: BenchRun,
): string {
  const lines: string[] = [
    `# So sánh ${a.label} → ${b.label}`,
    "",
    `- ${a.label}: ${a.createdAt} · ${a.gitSha} · ${a.latestMigration} · ${formatScale(a.scale)}`,
    `- ${b.label}: ${b.createdAt} · ${b.gitSha} · ${b.latestMigration} · ${formatScale(b.scale)}`,
    "",
    `| Ca | Vai trò | p50 ${a.label} | p50 ${b.label} | Δ p50 | p95 ${a.label} | p95 ${b.label} | Δ p95 |`,
    "|---|---|---|---|---|---|---|---|",
  ];
  for (const r of rows) {
    lines.push(
      `| ${r.id} | ${r.role} | ${formatCell(r.a, r.a?.summary.p50 ?? null)} | ${formatCell(r.b, r.b?.summary.p50 ?? null)} | ${formatDelta(r.deltaP50Pct)} | ${formatCell(r.a, r.a?.summary.p95 ?? null)} | ${formatCell(r.b, r.b?.summary.p95 ?? null)} | ${formatDelta(r.deltaP95Pct)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}
