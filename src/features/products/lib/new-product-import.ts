// File thuần (bẫy 9): logic màn xem trước "Nhập mã hàng mới" (IMP-02/03) —
// component và file *.test.ts cùng import.
import { removeDiacritics } from "@/shared/lib/text";

import type { LookupItem, Lookups, ProductKind } from "../types";
import {
  duplicateProblemsInFile,
  type LookupText,
  type NewProductExportRow,
  type NewProductFileRow,
} from "./new-product-file";

/** Một dòng trên màn xem trước: cột từ file + các trường người dùng chọn. */
export type DraftRow = {
  row: number;
  code: string;
  /** Sửa được trên màn xem trước — ô tên trống trong file được tự điền từ sheet tên hàng chuẩn. */
  name: string;
  /** Tên đang hiện là tên tự điền từ sheet; người dùng gõ lại thì thành false. */
  nameFromSheet: boolean;
  stock: number;
  description: string;
  /** Lỗi đọc file (tồn không phải số…) — không sửa được trên màn, phải sửa file. */
  fileProblems: string[];
  kind: ProductKind;
  categoryId: string | null;
  unitId: string | null;
  isActive: boolean;
  directSale: boolean;
  shelfLocation: string;
  /** Xử lý (công đoạn); null = Mua ngoài. */
  stageId: string | null;
  /** Kho mặc định (cột "Vị trí" của file); null = kho ghi tồn. */
  warehouseId: string | null;
  /** Chữ trong file không khớp danh mục nào — báo lỗi tới khi người dùng chọn lại ô đó. */
  unmatched: Partial<LookupText>;
};

export type DraftFields = Omit<DraftRow, "row" | "code" | "stock" | "description" | "fileProblems" | "unmatched">;

const normalizeLookup = (value: string) => removeDiacritics(value).trim().replace(/\s+/g, " ").toUpperCase();

/**
 * Khớp chữ trong file với danh mục theo mã hoặc tên, không dấu, không hoa thường —
 * cùng quy tắc `khop_danh_muc` của file cập nhật ("MUA_NGOAI" khớp cả "Mua ngoài").
 * Nhiều mục cùng khớp thì không đoán: trả null để người dùng chọn.
 */
export function matchLookup(items: ReadonlyArray<LookupItem>, value: string): string | null {
  const wanted = normalizeLookup(value);
  if (wanted === "") return null;
  const hits = items.filter(
    (item) =>
      normalizeLookup(item.code) === wanted ||
      normalizeLookup(item.code.replace(/_/g, " ")) === wanted ||
      normalizeLookup(item.name) === wanted,
  );
  return hits.length === 1 ? hits[0].id : null;
}

const LOOKUP_FIELDS = [
  { text: "category", id: "categoryId", list: "categories", label: "nhóm hàng" },
  { text: "unit", id: "unitId", list: "units", label: "đơn vị tính" },
  { text: "stage", id: "stageId", list: "stages", label: "xử lý" },
  { text: "warehouse", id: "warehouseId", list: "warehouses", label: "vị trí (kho)" },
] as const;

/** `lookups` vắng (danh mục chưa tải) = coi như mọi ô danh mục trong file đều chưa khớp. */
export function toDraftRows(
  rows: NewProductFileRow[],
  defaults: { unitId: string | null; lookups?: Lookups },
): DraftRow[] {
  return rows.map((r) => {
    const ids: Record<(typeof LOOKUP_FIELDS)[number]["id"], string | null> = {
      categoryId: null,
      unitId: null,
      stageId: null,
      warehouseId: null,
    };
    const unmatched: Partial<LookupText> = {};
    for (const field of LOOKUP_FIELDS) {
      const value = r.lookupText?.[field.text] ?? "";
      if (value === "") continue;
      ids[field.id] = matchLookup(defaults.lookups?.[field.list] ?? [], value);
      if (ids[field.id] === null) unmatched[field.text] = value;
    }
    return {
      row: r.row,
      code: r.code,
      name: r.name,
      nameFromSheet: r.nameFromSheet,
      stock: r.stock,
      description: r.description,
      fileProblems: r.problems,
      kind: "HANG_HOA",
      ...ids,
      // Ô ĐVT để trống trong file = Cái; có chữ mà không khớp thì để người dùng chọn.
      unitId: r.lookupText?.unit ? ids.unitId : defaults.unitId,
      isActive: r.isActive ?? true,
      directSale: true,
      shelfLocation: "",
      unmatched,
    };
  });
}

/** Áp một bộ giá trị cho các dòng đã chọn (theo số dòng file); dòng khác giữ nguyên. */
export function applyToRows(rows: DraftRow[], selected: ReadonlyArray<number>, patch: Partial<DraftFields>): DraftRow[] {
  const picked = new Set(selected);
  // Người dùng đã chọn lại ô danh mục (kể cả xóa trống) → chữ không khớp trong file hết hiệu lực.
  const resolved = LOOKUP_FIELDS.filter((field) => field.id in patch).map((field) => field.text);
  return rows.map((r) => {
    if (!picked.has(r.row)) return r;
    const unmatched = { ...r.unmatched };
    for (const text of resolved) delete unmatched[text];
    return { ...r, ...patch, unmatched };
  });
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
      ...(r.name.trim() === "" ? ["Thiếu tên hàng"] : []),
      ...r.fileProblems,
      ...(inFile.get(r.row) ?? []),
      ...LOOKUP_FIELDS.flatMap((field) => {
        const value = r.unmatched[field.text];
        return value ? [`Không có ${field.label} “${value}” — chọn lại`] : [];
      }),
      ...(r.unitId || r.unmatched.unit ? [] : ["Chưa chọn đơn vị tính"]),
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
  /** "Mô tả" trong file → san_pham.mo_ta (0086); ghi_chu do DB tự sinh. */
  mo_ta: string;
  dvt_id: string | null;
  nhom_hang_id: string | null;
  /** 0141: cột "Xử lý" của file; null = Mua ngoài. */
  cong_doan_id: string | null;
  /** 0141: cột "Vị trí" của file; null = kho ghi tồn (p_kho_id). */
  kho_mac_dinh_id: string | null;
  loai_hang: ProductKind;
  dang_kinh_doanh: boolean;
  duoc_ban_truc_tiep: boolean;
  vi_tri_ke: string;
};

function toPayloadRow(r: DraftRow): ImportPayloadRow {
  return {
    dong: r.row,
    ma_hang: r.code,
    // Tên sửa tay trên màn xem trước: gộp khoảng trắng như bộ đọc file.
    ten_hang: r.name.trim().replace(/\s+/g, " "),
    ton_kho: r.stock,
    mo_ta: r.description,
    dvt_id: r.unitId,
    nhom_hang_id: r.categoryId,
    cong_doan_id: r.stageId,
    kho_mac_dinh_id: r.warehouseId,
    loai_hang: r.kind,
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

const nameOf = (items: ReadonlyArray<LookupItem> | undefined, id: string | null, fallback = "") =>
  (id ? items?.find((item) => item.id === id)?.name : undefined) ?? fallback;

/** Dòng ghi ra file lỗi: đủ 9 cột như file mẫu + lý do, sửa rồi nhập lại được ngay. */
export function toErrorExportRows(
  rows: DraftRow[],
  problems: Map<number, string[]>,
  lookups?: Lookups,
): NewProductExportRow[] {
  return rows
    .filter((r) => problems.has(r.row))
    .map((r) => ({
      code: r.code,
      name: r.name,
      // Ô đã chọn trên màn → tên danh mục; ô chưa khớp → giữ đúng chữ trong file để sửa.
      category: nameOf(lookups?.categories, r.categoryId, r.unmatched.category),
      // Tồn không đọc được thành số thì để trống, người dùng gõ lại.
      stock: r.fileProblems.length > 0 ? null : r.stock,
      unit: nameOf(lookups?.units, r.unitId, r.unmatched.unit),
      stage: nameOf(lookups?.stages, r.stageId, r.unmatched.stage),
      isActive: r.isActive,
      description: r.description,
      warehouse: nameOf(lookups?.warehouses, r.warehouseId, r.unmatched.warehouse),
      reason: (problems.get(r.row) ?? []).join("; "),
    }));
}
