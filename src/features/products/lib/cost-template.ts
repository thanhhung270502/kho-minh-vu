/**
 * Mẫu Excel giá vốn đầu kỳ — chỉ hai cột. File này KHÔNG import `node:` nên
 * Client Component dùng được để hiện tên cột trong bảng lỗi.
 *
 * Khóa cột là hợp đồng với RPC `dat_gia_von_dau_ky` — giữ nguyên tiếng Việt.
 */
export const COST_TEMPLATE_COLUMNS = [
  { key: "ma_hang", title: "Mã hàng", width: 22 },
  { key: "gia_von", title: "Giá vốn", width: 16 },
] as const;

export type CostRowPayload = { ma_hang: string | null; gia_von: number | null };

/** Hình dạng jsonb do RPC trả về — map sang miền ở lớp gọi API. */
export type CostImportResultPayload = {
  da_nap: boolean;
  dat: number;
  bo_qua: number;
  so_loi: number;
  chi_tiet_dat: Array<{ ma_hang: string; gia_von: number }>;
  chi_tiet_bo_qua: Array<{
    ma_hang: string;
    gia_von_hien_tai: number;
    ly_do: string;
  }>;
  loi: Array<{ ma_hang: string; ly_do: string }>;
};

// --- Mô hình miền -----------------------------------------------------------

export type SkippedCostRow = {
  code: string;
  currentCost: number;
  reason: string;
};

export type CostErrorRow = { code: string; reason: string };

export type CostImportResult = {
  committed: boolean;
  applied: number;
  skipped: number;
  errorCount: number;
  skippedRows: SkippedCostRow[];
  errors: CostErrorRow[];
};

export function toCostImportResult(
  payload: CostImportResultPayload,
): CostImportResult {
  return {
    committed: payload.da_nap,
    applied: payload.dat,
    skipped: payload.bo_qua,
    errorCount: payload.so_loi,
    skippedRows: payload.chi_tiet_bo_qua.map((row) => ({
      code: row.ma_hang,
      currentCost: Number(row.gia_von_hien_tai),
      reason: row.ly_do,
    })),
    errors: payload.loi.map((row) => ({ code: row.ma_hang, reason: row.ly_do })),
  };
}
