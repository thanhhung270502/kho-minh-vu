/**
 * Chuỗi hiển thị cho thẻ KPI / việc cần làm của tổng quan 3b. Hàm thuần.
 *
 * D-04: người dùng không có quyền giá vốn thấy "Tổng SL tồn" thay vì "Giá trị tồn".
 * D-09: so sánh tháng trước và đường xu hướng là ƯỚC TÍNH theo giá vốn hiện tại
 * (hệ thống không lưu ảnh chụp tồn theo ngày).
 */
import type { NegativeByWarehouse, OverviewKpis } from "../types";

const number = (value: number, maxFraction = 1) =>
  value.toLocaleString("vi-VN", { maximumFractionDigits: maxFraction });

/** null khi kỳ trước không có số để so (0 hoặc thiếu). Làm tròn 1 chữ số thập phân. */
export function percentChange(current: number, previous: number | null): number | null {
  if (previous == null || previous === 0) return null;
  return Math.round(((current - previous) / previous) * 1000) / 10;
}

export function formatPercentDelta(percent: number | null, monthNumber: number): string {
  if (percent == null) return "Chưa đủ dữ liệu tháng trước";
  if (percent === 0) return `Bằng tháng ${monthNumber}`;
  const arrow = percent > 0 ? "↑" : "↓";
  return `${arrow} ${number(Math.abs(percent))}% so tháng ${monthNumber}`;
}

export function previousMonthNumber(isoDate: string): number {
  const month = Number(isoDate.slice(5, 7));
  return month === 1 ? 12 : month - 1;
}

export function formatMoneyShort(value: number): { value: string; unit: string } {
  if (Math.abs(value) >= 1_000_000_000) return { value: number(value / 1_000_000_000), unit: "tỷ đ" };
  if (Math.abs(value) >= 1_000_000) return { value: number(value / 1_000_000), unit: "tr đ" };
  return { value: number(value, 0), unit: "đ" };
}

export function buildInventoryKpi(
  kpis: Pick<
    OverviewKpis,
    "canViewCost" | "inventoryValue" | "inventoryValuePrevMonth" | "totalQuantity" | "totalQuantityPrevMonth"
  >,
  todayIso: string,
): { label: string; value: string; unit: string; delta: string } {
  const month = previousMonthNumber(todayIso);
  if (kpis.canViewCost && kpis.inventoryValue != null) {
    const money = formatMoneyShort(kpis.inventoryValue);
    return {
      label: "Giá trị tồn",
      value: money.value,
      unit: money.unit,
      delta: formatPercentDelta(percentChange(kpis.inventoryValue, kpis.inventoryValuePrevMonth), month),
    };
  }
  return {
    label: "Tổng SL tồn",
    value: number(kpis.totalQuantity, 0),
    unit: "",
    delta: formatPercentDelta(percentChange(kpis.totalQuantity, kpis.totalQuantityPrevMonth), month),
  };
}

export const newProductsLabel = (count: number): string =>
  count > 0 ? `+${number(count, 0)} mã tháng này` : "Không có mã mới tháng này";

export const averageIssuesLabel = (average: number): string => `TB ${number(average)} phiếu/ngày`;

export function oldestPendingLabel(days: number | null): string {
  if (days == null) return "Không có phiếu chờ";
  return days === 0 ? "Cũ nhất hôm nay" : `Cũ nhất ${number(days, 0)} ngày`;
}

export function examplesLabel(examples: string[], total: number): string {
  if (examples.length === 0) return "Không có";
  const list = examples.join(", ");
  return total > examples.length ? `${list} và ${total - examples.length} mã khác` : list;
}

export function pendingBreakdownLabel(total: number, receipts: number, issues: number): string {
  const parts = [`${receipts} phiếu nhập`, `${issues} phiếu xuất`];
  const others = total - receipts - issues;
  if (others > 0) parts.push(`${others} phiếu trả`);
  return parts.join(" · ");
}

export function negativeByWarehouseLabel(rows: NegativeByWarehouse[]): string {
  if (rows.length === 0) return "Không có";
  return rows.map((row) => `${row.warehouseName}: ${row.count} mã`).join(" · ");
}

/** Phần trăm tổng SL của từng nhóm, làm tròn 1 chữ số; tổng 0 thì mọi nhóm 0%. */
export function groupShare(rows: { key: string; totalQuantity: number }[]): Map<string, number> {
  const sum = rows.reduce((acc, row) => acc + row.totalQuantity, 0);
  return new Map(
    rows.map((row) => [row.key, sum > 0 ? Math.round((row.totalQuantity / sum) * 1000) / 10 : 0]),
  );
}

export function formatUpdatedAt(timestampMs: number): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(timestampMs));
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return `Cập nhật ${get("hour")}:${get("minute")} · ${get("day")}/${get("month")}/${get("year")}`;
}
