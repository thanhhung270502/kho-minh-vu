// File thuần (bẫy 9): logic màn xem trước "Nhập mã hàng mới" (IMP-02/03) —
// component và scripts/test-pure-functions.ts cùng import.
import { duplicateProblemsInFile, type NewProductFileRow } from "./new-product-file";

/** Một dòng trên màn xem trước: cột từ file + các trường người dùng chọn. */
export type DraftRow = {
  row: number;
  code: string;
  name: string;
  stock: number;
  description: string;
  /** Lỗi đọc file (tồn không phải số…) — không sửa được trên màn, phải sửa file. */
  fileProblems: string[];
  productTypeId: string | null;
  categoryId: string | null;
  vehicleLineId: string | null;
  unitId: string | null;
  isActive: boolean;
  directSale: boolean;
  shelfLocation: string;
};

export type DraftFields = Omit<DraftRow, "row" | "code" | "name" | "stock" | "description" | "fileProblems">;

export function toDraftRows(rows: NewProductFileRow[], defaults: { unitId: string | null }): DraftRow[] {
  return rows.map((r) => ({
    row: r.row,
    code: r.code,
    name: r.name,
    stock: r.stock,
    description: r.description,
    fileProblems: r.problems,
    productTypeId: null,
    categoryId: null,
    vehicleLineId: null,
    unitId: defaults.unitId,
    isActive: true,
    directSale: true,
    shelfLocation: "",
  }));
}

/** Áp một bộ giá trị cho các dòng đã chọn (theo số dòng file); dòng khác giữ nguyên. */
export function applyToRows(rows: DraftRow[], selected: ReadonlyArray<number>, patch: Partial<DraftFields>): DraftRow[] {
  const picked = new Set(selected);
  return rows.map((r) => (picked.has(r.row) ? { ...r, ...patch } : r));
}

/**
 * Câu lỗi trùng danh mục — CHÉP NGUYÊN từ nhap_ma_hang_moi (0081). Màn xem trước
 * gọi RPC ở chế độ kiểm tra chỉ để lấy hai lỗi này (client không tự biết danh mục);
 * mọi lỗi khác client tự kiểm trực tiếp để cập nhật ngay khi người dùng chọn.
 */
export const CATALOG_REASONS = {
  code: "Mã hàng đã có trong danh mục",
  name: "Tên hàng đã có trong danh mục",
} as const;

const CATALOG_REASON_SET = new Set<string>(Object.values(CATALOG_REASONS));

/** Khóa `dong` / `ly_do` là hợp đồng jsonb trả về từ RPC — giữ snake_case. */
export function catalogProblemsFrom(errors: ReadonlyArray<{ dong: number; ly_do: string }>): Map<number, string[]> {
  const result = new Map<number, string[]>();
  for (const e of errors) {
    const reasons = e.ly_do.split("; ").filter((reason) => CATALOG_REASON_SET.has(reason));
    if (reasons.length > 0) result.set(e.dong, reasons);
  }
  return result;
}

/** Mọi lỗi của từng dòng, theo thứ tự: file → trùng trong file → thiếu ĐVT → trùng danh mục. */
export function draftProblems(rows: DraftRow[], catalog: Map<number, string[]>): Map<number, string[]> {
  const inFile = duplicateProblemsInFile(rows);
  const result = new Map<number, string[]>();
  for (const r of rows) {
    const problems = [
      ...(r.code === "" ? ["Thiếu mã hàng"] : []),
      ...(r.name === "" ? ["Thiếu tên hàng"] : []),
      ...r.fileProblems,
      ...(inFile.get(r.row) ?? []),
      ...(r.unitId ? [] : ["Chưa chọn đơn vị tính"]),
      ...(catalog.get(r.row) ?? []),
    ];
    if (problems.length > 0) result.set(r.row, problems);
  }
  return result;
}

/**
 * Khóa snake_case tiếng Việt CÓ CHỦ ĐÍCH: hợp đồng jsonb gửi thẳng cho RPC
 * `nhap_ma_hang_moi` (0081 đọc `d->>'ma_hang'`, `d->>'dvt_id'`…).
 */
export type ImportPayloadRow = {
  dong: number;
  ma_hang: string;
  ten_hang: string;
  ton_kho: number;
  ghi_chu: string;
  dvt_id: string | null;
  nhom_hang_id: string | null;
  loai_hang_id: string | null;
  dong_xe_id: string | null;
  dang_kinh_doanh: boolean;
  duoc_ban_truc_tiep: boolean;
  vi_tri_ke: string;
};

function toPayloadRow(r: DraftRow): ImportPayloadRow {
  return {
    dong: r.row,
    ma_hang: r.code,
    ten_hang: r.name,
    ton_kho: r.stock,
    ghi_chu: r.description,
    dvt_id: r.unitId,
    nhom_hang_id: r.categoryId,
    loai_hang_id: r.productTypeId,
    dong_xe_id: r.vehicleLineId,
    dang_kinh_doanh: r.isActive,
    duoc_ban_truc_tiep: r.directSale,
    vi_tri_ke: r.shelfLocation.trim(),
  };
}

/** Chỉ gửi dòng sạch — dòng đang lỗi đi thẳng vào file lỗi, không làm RPC báo lại. */
export function toImportPayload(rows: DraftRow[], problems: Map<number, string[]>): ImportPayloadRow[] {
  return rows.filter((r) => !problems.has(r.row)).map(toPayloadRow);
}

/** Gửi CẢ file cho RPC ở chế độ kiểm tra — để lấy lỗi trùng danh mục của mọi dòng. */
export function toCheckPayload(rows: DraftRow[]): ImportPayloadRow[] {
  return rows.map(toPayloadRow);
}

/** Dòng ghi ra file lỗi: 4 cột mẫu + lý do, đúng giá trị trong file để sửa rồi nhập lại. */
export function toErrorExportRows(
  rows: DraftRow[],
  problems: Map<number, string[]>,
): Array<{ code: string; name: string; stock: number | null; description: string; reason: string }> {
  return rows
    .filter((r) => problems.has(r.row))
    .map((r) => ({
      code: r.code,
      name: r.name,
      // Tồn không đọc được thành số thì để trống, người dùng gõ lại.
      stock: r.fileProblems.length > 0 ? null : r.stock,
      description: r.description,
      reason: (problems.get(r.row) ?? []).join("; "),
    }));
}
