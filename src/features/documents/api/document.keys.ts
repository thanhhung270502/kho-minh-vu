/** Phạm vi màn hình — tách nhánh cache để nhập/xuất/trả không đụng nhau. */
export type DocumentScope = "nhap" | "xuat" | "tra";

export const documentKeys = {
  all: ["documents"] as const,
  list: (scope: DocumentScope, filter: unknown) =>
    ["documents", "list", scope, filter] as const,
  // Key bỏ trạng thái/trang nên tích ô hay sang trang không đếm lại. Nằm dưới
  // ["documents"] nên ghi sổ/hủy (invalidate documentKeys.all) cũng đếm lại.
  statusCounts: (scope: DocumentScope, args: unknown) =>
    ["documents", "status-counts", scope, args] as const,
  detail: (id: string) => ["documents", "detail", id] as const,
  lines: (id: string) => ["documents", "lines", id] as const,
};
