import type { ReceiptFilter } from "../schemas/receipt.schema";

export const receiptKeys = {
  all: ["receipts"] as const,
  list: (filter: ReceiptFilter) => ["receipts", "list", filter] as const,
  detail: (id: string) => ["receipts", "detail", id] as const,
  lines: (id: string) => ["receipts", "lines", id] as const,
};
