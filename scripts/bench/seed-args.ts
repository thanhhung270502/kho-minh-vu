export const FIVE_YEARS_DAYS = 1826;
const MAX_DAYS = 3660;

export type SeedArgs = { days: number; dryRun: boolean };

function parseCount(raw: string | undefined): number {
  const n = Number(raw);
  if (raw === undefined || !Number.isInteger(n) || n < 1) {
    throw new Error(`--days phải là số nguyên từ 1 đến ${MAX_DAYS}`);
  }
  return n;
}

export function parseSeedArgs(argv: string[]): SeedArgs {
  let days = FIVE_YEARS_DAYS;
  let dryRun = false;
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--dry-run") {
      dryRun = true;
    } else if (arg === "--days") {
      days = parseCount(argv[++i]);
    } else if (arg === "--years") {
      const years = parseCount(argv[++i]);
      days = years * 365 + Math.floor(years / 4);
    }
  }
  if (days < 1 || days > MAX_DAYS) {
    throw new Error(`--days phải là số nguyên từ 1 đến ${MAX_DAYS}`);
  }
  return { days, dryRun };
}

/** Ngày hiện tại theo giờ Việt Nam, dạng YYYY-MM-DD. */
export function vnToday(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

// Tính trên UTC để không dính giờ mùa hè của máy chạy.
export function addDays(day: string, delta: number): string {
  const [y, m, d] = day.split("-").map(Number);
  const next = new Date(Date.UTC(y ?? 1970, (m ?? 1) - 1, (d ?? 1) + delta));
  return next.toISOString().slice(0, 10);
}

export function seedDays(today: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(today, i + 1 - days));
}

export function groupByMonth(days: string[]): Map<string, string[]> {
  const grouped = new Map<string, string[]>();
  for (const day of days) {
    const key = day.slice(0, 7);
    const bucket = grouped.get(key);
    if (bucket) bucket.push(day);
    else grouped.set(key, [day]);
  }
  return grouped;
}

/** Mốc tồn đầu kỳ cố định cho mọi lần chạy ≤ 5 năm, để chạy 99 ngày rồi 5 năm không lệch mốc. */
export function horizonStart(today: string, days: number): string {
  return addDays(today, -Math.max(days, FIVE_YEARS_DAYS));
}
