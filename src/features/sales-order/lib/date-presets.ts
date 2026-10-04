export type DatePreset = "7d" | "30d" | "month" | "custom";

export const DATE_PRESETS: DatePreset[] = ["7d", "30d", "month", "custom"];

export const DATE_PRESET_LABELS: Record<DatePreset, string> = {
  "7d": "7N",
  "30d": "30N",
  month: "Tháng",
  custom: "Tùy",
};

/** Vercel chạy UTC — phải lấy ngày theo giờ VN, không dùng ngày của máy. */
export function todayInVietnam(now: Date = new Date()): string {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}

function addDays(iso: string, days: number): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

export function datePresetRange(
  preset: Exclude<DatePreset, "custom">,
  today: string,
): { fromDate: string; toDate: string } {
  switch (preset) {
    case "7d":
      return { fromDate: addDays(today, -6), toDate: today };
    case "30d":
      return { fromDate: addDays(today, -29), toDate: today };
    case "month":
      return { fromDate: `${today.slice(0, 7)}-01`, toDate: today };
  }
}

export function activeDatePreset(
  fromDate: string | null,
  toDate: string | null,
  today: string,
): DatePreset | null {
  if (fromDate === null && toDate === null) return null;
  for (const preset of ["7d", "30d", "month"] as const) {
    const range = datePresetRange(preset, today);
    if (range.fromDate === fromDate && range.toDate === toDate) return preset;
  }
  return "custom";
}
