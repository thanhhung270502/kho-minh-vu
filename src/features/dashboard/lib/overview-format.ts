/** Chuỗi hiển thị cho thẻ KPI / việc cần làm của trang Tổng quan. Hàm thuần. */
import type { NegativeByWarehouse } from "../types";

const number = (value: number, maxFraction = 1) =>
  value.toLocaleString("vi-VN", { maximumFractionDigits: maxFraction });

/** "Hôm qua 12 · ▲ +3" — chênh lệch tuyệt đối, hôm qua = 0 không phải chia. */
export function vsYesterdayLabel(today: number, yesterday: number): string {
  const diff = today - yesterday;
  if (diff === 0) return `Bằng hôm qua (${number(yesterday, 0)})`;
  return `Hôm qua ${number(yesterday, 0)} · ${diff > 0 ? "▲ +" : "▼ −"}${number(Math.abs(diff), 0)}`;
}

export const averageIssuesLabel = (average: number): string => `TB ${number(average)} phiếu/ngày`;

export function oldestPendingLabel(days: number | null): string {
  if (days == null) return "Không có phiếu chờ";
  return days === 0 ? "Cũ nhất hôm nay" : `Cũ nhất ${number(days, 0)} ngày`;
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
