// File thuần (bẫy 9): kỳ phân tích tuần / tháng / quý / năm + bộ lọc trên URL.
// Component và scripts/test-pure-functions.ts cùng import. Ngày là chuỗi
// YYYY-MM-DD theo giờ Việt Nam — khớp tham số date của RPC phan_tich_theo_ky.
import dayjs, { type Dayjs } from "dayjs";

export const PERIOD_UNITS = ["tuan", "thang", "quy", "nam"] as const;
export type PeriodUnit = (typeof PERIOD_UNITS)[number];

export const PERIOD_UNIT_LABELS: Record<PeriodUnit, string> = {
  tuan: "Tuần",
  thang: "Tháng",
  quy: "Quý",
  nam: "Năm",
};

export type DateRange = { from: string; to: string };
/** Bước gom của biểu đồ — giá trị p_buoc của RPC nhap_xuat_theo_ky. */
export type SeriesStep = "ngay" | "tuan" | "thang";

const FMT = "YYYY-MM-DD";

/** Đầu kỳ chứa ngày `d`. Tuần bắt đầu thứ Hai (cùng date_trunc('week') của Postgres). */
function startOf(unit: PeriodUnit, d: Dayjs): Dayjs {
  switch (unit) {
    case "tuan":
      return d.subtract((d.day() + 6) % 7, "day").startOf("day");
    case "thang":
      return d.startOf("month");
    case "quy":
      return d.month(Math.floor(d.month() / 3) * 3).startOf("month");
    case "nam":
      return d.startOf("year");
  }
}

function lengthOf(unit: PeriodUnit): { n: number; u: "day" | "month" } {
  if (unit === "tuan") return { n: 7, u: "day" };
  if (unit === "thang") return { n: 1, u: "month" };
  if (unit === "quy") return { n: 3, u: "month" };
  return { n: 12, u: "month" };
}

/**
 * Khoảng ngày của kỳ chứa `anchor`. Kỳ đang chạy cắt ở `today`: so với kỳ trước
 * CÙNG SỐ NGÀY (RPC tự lùi), không đem 5 ngày đầu tháng so với cả tháng trước.
 */
export function periodRange(unit: PeriodUnit, anchor: string, today: string): DateRange {
  const start = startOf(unit, dayjs(anchor));
  const { n, u } = lengthOf(unit);
  const end = start.add(n, u).subtract(1, "day");
  const to = end.isAfter(dayjs(today)) ? today : end.format(FMT);
  return { from: start.format(FMT), to };
}

/** Mốc của kỳ trước (delta = −1) / kỳ sau (+1). */
export function shiftPeriod(unit: PeriodUnit, anchor: string, delta: number): string {
  const { n, u } = lengthOf(unit);
  return startOf(unit, dayjs(anchor)).add(delta * n, u).format(FMT);
}

/** Kỳ chứa `today` thì không cho bấm sang kỳ sau (chưa có dữ liệu). */
export function isCurrentPeriod(unit: PeriodUnit, anchor: string, today: string): boolean {
  return startOf(unit, dayjs(anchor)).isSame(startOf(unit, dayjs(today)), "day");
}

export function periodLabel(unit: PeriodUnit, anchor: string): string {
  const s = startOf(unit, dayjs(anchor));
  switch (unit) {
    case "tuan":
      return `Tuần ${s.format("DD/MM")} – ${s.add(6, "day").format("DD/MM/YYYY")}`;
    case "thang":
      return `Tháng ${s.month() + 1}/${s.year()}`;
    case "quy":
      return `Quý ${Math.floor(s.month() / 3) + 1}/${s.year()}`;
    case "nam":
      return `Năm ${s.year()}`;
  }
}

/** Tuần, tháng → từng ngày; quý → từng tuần; năm → từng tháng. */
export function seriesStep(unit: PeriodUnit): SeriesStep {
  if (unit === "quy") return "tuan";
  if (unit === "nam") return "thang";
  return "ngay";
}

/** Nhãn trục biểu đồ cho một mốc gom. */
export function stepLabel(step: SeriesStep, date: string): string {
  const d = dayjs(date);
  if (step === "thang") return `T${d.month() + 1}`;
  return d.format("DD/MM");
}

// --- Bộ lọc trên URL (tham số tiếng Việt không dấu — CLAUDE.md) ---------------

export type PeriodFilter = {
  unit: PeriodUnit;
  /** Một ngày bất kỳ trong kỳ — URL giữ đầu kỳ. */
  anchor: string;
  warehouseId: string | null;
  brandCode: string | null;
  /** Chỉ có nghĩa khi đã chọn hãng (mã dòng chỉ duy nhất trong một hãng). */
  modelCode: string | null;
  partCode: string | null;
  stageId: string | null;
  categoryId: string | null;
};

export function defaultPeriodFilter(today: string): PeriodFilter {
  return {
    unit: "thang",
    anchor: startOf("thang", dayjs(today)).format(FMT),
    warehouseId: null,
    brandCode: null,
    modelCode: null,
    partCode: null,
    stageId: null,
    categoryId: null,
  };
}

const PARAMS = {
  unit: "ky",
  anchor: "moc",
  warehouseId: "kho",
  brandCode: "hang",
  modelCode: "dong",
  partCode: "linh_kien",
  stageId: "xu_ly",
  categoryId: "nhom",
} as const;

export function readPeriodFilter(params: URLSearchParams, today: string): PeriodFilter {
  const base = defaultPeriodFilter(today);
  const unitParam = params.get(PARAMS.unit);
  const unit = (PERIOD_UNITS as readonly string[]).includes(unitParam ?? "") ? (unitParam as PeriodUnit) : base.unit;
  const anchorParam = params.get(PARAMS.anchor);
  // Không dùng plugin customParseFormat: kiểm dạng bằng regex rồi mới để dayjs đọc.
  const anchor = anchorParam && /^\d{4}-\d{2}-\d{2}$/.test(anchorParam) && dayjs(anchorParam).isValid() ? anchorParam : today;
  const text = (key: string) => params.get(key)?.trim() || null;
  const brandCode = text(PARAMS.brandCode);
  return {
    unit,
    anchor: startOf(unit, dayjs(anchor)).format(FMT),
    warehouseId: text(PARAMS.warehouseId),
    brandCode,
    modelCode: brandCode ? text(PARAMS.modelCode) : null,
    partCode: text(PARAMS.partCode),
    stageId: text(PARAMS.stageId),
    categoryId: text(PARAMS.categoryId),
  };
}

/** Giữ các tham số khác trên URL (vd `tab`), chỉ ghi đè phần bộ lọc kỳ. */
export function writePeriodFilter(filter: PeriodFilter, current: URLSearchParams): URLSearchParams {
  const next = new URLSearchParams(current);
  for (const [field, key] of Object.entries(PARAMS) as Array<[keyof PeriodFilter, string]>) {
    const value = filter[field];
    if (value) next.set(key, value);
    else next.delete(key);
  }
  return next;
}

export function countActivePeriodFilters(filter: PeriodFilter): number {
  return [filter.warehouseId, filter.brandCode, filter.modelCode, filter.partCode, filter.stageId, filter.categoryId]
    .filter(Boolean).length;
}
