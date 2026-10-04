/** Dùng chung cho cột Tiến độ trên bảng và file Excel. */
export function orderProgress(
  shipped: number,
  ordered: number,
): { percent: number | null; label: string } {
  if (ordered <= 0) return { percent: null, label: "—" };
  return {
    percent: Math.min(100, Math.round((shipped / ordered) * 100)),
    label: `${shipped.toLocaleString("vi-VN")}/${ordered.toLocaleString("vi-VN")}`,
  };
}
