import { documentKeys, type DocumentScope } from "@/features/documents/api/document.keys";

import type { IssueFilter } from "../schemas/issue.schema";

const SCOPE: DocumentScope = "xuat";

export const issueKeys = {
  all: ["documents", "list", SCOPE] as const,
  list: (filter: IssueFilter) => documentKeys.list(SCOPE, filter),
  detail: (id: string) => documentKeys.detail(id),
  lines: (id: string) => documentKeys.lines(id),
  /** Gợi ý mã gần giống (D-14) — theo mã hàng và kho đang xuất âm. */
  similar: (productId: string, warehouseId: string) =>
    ["documents", "similar-codes", productId, warehouseId] as const,
};
