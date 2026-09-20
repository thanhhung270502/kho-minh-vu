import type { OrderLine } from "../types";

/**
 * Nhóm theo kho cho phiếu đi lấy hàng (Claude's Discretion, 04-CONTEXT.md):
 * kho đi hết kho 1 rồi mới sang kho 2, không chạy qua lại; dòng tiêu đề giữ
 * tờ giấy tối giản đúng D-09 mà vẫn đọc được ranh giới; thứ tự theo mã cho
 * mắt quét ổn định.
 *
 * File thuần, không gắn chỉ thị client component nào (bẫy 9): test được bằng
 * `npx tsx scripts/test-pure-functions.ts`, và Server Component cũng import
 * được nếu sau này cần.
 */
export type PickingPrintRow =
  | { kind: "group"; warehouseName: string }
  | { kind: "line"; line: OrderLine; index: number };

/** Đơn đã xác nhận vẫn có thể chứa mã thiếu kho mặc định — RPC chỉ chặn lúc
 * tạo phiếu xuất (0056), không chặn lúc thêm dòng vào đơn. Gom nhóm cuối. */
export const UNASSIGNED_WAREHOUSE_LABEL = "Chưa gán kho";

export function groupLinesByWarehouse(lines: OrderLine[]): PickingPrintRow[] {
  const assigned = lines
    .filter((line) => line.defaultWarehouseName !== null)
    .sort((a, b) => {
      const warehouseCompare = (a.defaultWarehouseName ?? "").localeCompare(
        b.defaultWarehouseName ?? "",
        "vi",
      );
      if (warehouseCompare !== 0) return warehouseCompare;
      return a.productCode.localeCompare(b.productCode, "vi");
    });

  const unassigned = lines
    .filter((line) => line.defaultWarehouseName === null)
    .sort((a, b) => a.productCode.localeCompare(b.productCode, "vi"));

  const ordered = [...assigned, ...unassigned];

  const rows: PickingPrintRow[] = [];
  let currentGroup: string | null = null;
  let index = 0;

  for (const line of ordered) {
    const warehouseLabel = line.defaultWarehouseName ?? UNASSIGNED_WAREHOUSE_LABEL;
    if (warehouseLabel !== currentGroup) {
      rows.push({ kind: "group", warehouseName: warehouseLabel });
      currentGroup = warehouseLabel;
    }

    // STT liên tục trong cả tờ — không đánh lại từ 1 ở mỗi kho.
    index += 1;
    rows.push({ kind: "line", line, index });
  }

  return rows;
}
