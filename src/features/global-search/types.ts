import type { Database } from "@/types/database.types";

type SearchRowDb = Database["public"]["Functions"]["tim_kiem_toan_cuc"]["Returns"][number];

export type SearchKind = "product" | "document" | "order" | "partner";

export type GlobalSearchResult = {
  /** `kind:id` — duy nhất giữa các nhóm, dùng làm key khi render. */
  key: string;
  kind: SearchKind;
  id: string;
  label: string;
  hint: string | null;
  /** `loai_ct` của chứng từ (NHAP, XUAT, ...); null với nhóm khác. */
  documentType: string | null;
  status: string | null;
  rank: number;
};

// Giá trị `loai` là hợp đồng với RPC tim_kiem_toan_cuc (0092) — bảng tra một chiều.
const KIND_FROM_DB: Record<string, SearchKind> = {
  san_pham: "product",
  chung_tu: "document",
  don_dat: "order",
  doi_tac: "partner",
};

export function toGlobalSearchResult(row: SearchRowDb): GlobalSearchResult | null {
  if (!Object.hasOwn(KIND_FROM_DB, row.loai)) return null;
  const kind = KIND_FROM_DB[row.loai];
  if (!kind) return null;
  return {
    key: `${kind}:${row.id}`,
    kind,
    id: row.id,
    label: row.nhan,
    hint: row.phu ?? null,
    documentType: row.loai_ct ?? null,
    status: row.trang_thai ?? null,
    rank: Number(row.xep_hang),
  };
}
