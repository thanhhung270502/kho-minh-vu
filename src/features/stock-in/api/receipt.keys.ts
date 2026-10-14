import { documentKeys, type DocumentScope } from "@/features/documents/api/document.keys";

import type { ReceiptFilter } from "../schemas/receipt.schema";

const SCOPE: DocumentScope = "nhap";

export const receiptKeys = {
  all: ["documents", "list", SCOPE] as const,
  list: (filter: ReceiptFilter) => documentKeys.list(SCOPE, filter),
  detail: (id: string) => documentKeys.detail(id),
  lines: (id: string) => documentKeys.lines(id),
  // Cùng gốc documentKeys.lines(id): sửa dòng làm mới dòng thì làm mới luôn số dòng ẩn.
  hiddenLines: (id: string) => [...documentKeys.lines(id), "an-nhom-hang"] as const,
};
