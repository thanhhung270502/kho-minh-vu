// File thuần (bẫy 9): cột file Excel đối tác, đọc ô loại / đang hoạt động. Route
// handler, bộ dựng file và scripts/test-pure-functions.ts cùng import.
import type { PartnerFormKind, PartnerKind } from "../types";

export type PartnerField =
  | "code"
  | "name"
  | "kind"
  | "phone"
  | "email"
  | "address"
  | "region"
  | "ward"
  | "taxCode"
  | "note"
  | "isActive";

export type PartnerColumn = {
  key: PartnerField;
  title: string;
  width: number;
  required?: boolean;
  /** Tên cột đã chuẩn hóa (bỏ dấu, gạch dưới) bộ đọc nhận — khớp đúng hoặc tiền tố. */
  match: string[];
  hint: string;
};

/** Cùng tiêu đề với file doi-tac.xlsx văn phòng đang dùng (xuất từ KiotViet). */
export const PARTNER_COLUMNS: PartnerColumn[] = [
  { key: "code", title: "Mã nhà cung cấp", width: 16, match: ["ma_nha_cung_cap", "ma_doi_tac", "ma_khach_hang", "ma"], hint: "Nhập mới: để trống thì hệ thống tự cấp mã theo loại. Cập nhật: bắt buộc — tìm đối tác theo mã." },
  { key: "name", title: "Tên nhà cung cấp", width: 36, required: true, match: ["ten_nha_cung_cap", "ten_doi_tac", "ten_khach_hang", "ten"], hint: "Tên đối tác." },
  { key: "kind", title: "Loại", width: 14, match: ["loai"], hint: "Đối tác hoặc Nội bộ. Nội bộ dùng mã NB… (nhập mới để trống mã thì tự cấp NB kế tiếp). Để trống = theo mã: NB… là Nội bộ, còn lại là Đối tác." },
  { key: "phone", title: "Điện thoại", width: 14, match: ["dien_thoai", "so_dien_thoai"], hint: "Chỉ gồm số và + ( ) . -" },
  { key: "email", title: "Email", width: 24, match: ["email"], hint: "" },
  { key: "address", title: "Địa chỉ", width: 32, match: ["dia_chi"], hint: "" },
  { key: "region", title: "Khu vực", width: 22, match: ["khu_vuc"], hint: "Tỉnh / thành phố." },
  { key: "ward", title: "Phường/xã", width: 22, match: ["phuong_xa"], hint: "" },
  { key: "taxCode", title: "Mã số thuế", width: 16, match: ["ma_so_thue"], hint: "" },
  { key: "note", title: "Ghi chú", width: 30, match: ["ghi_chu"], hint: "" },
  { key: "isActive", title: "Đang hoạt động", width: 14, match: ["dang_hoat_dong"], hint: "1 hoặc Có = đang hoạt động; 0 hoặc Không = ngừng. Nhập mới để trống = đang hoạt động." },
];

/** Gán mỗi trường một cột của file: khớp đúng trước, rồi tiền tố (vd. "ma_nha_cung_cap_"). */
export function mapPartnerHeaders(headers: readonly string[]): Partial<Record<PartnerField, string>> {
  const used = new Set<string>();
  const out: Partial<Record<PartnerField, string>> = {};
  for (const pass of ["exact", "prefix"] as const) {
    for (const col of PARTNER_COLUMNS) {
      if (out[col.key]) continue;
      for (const m of col.match) {
        const hit = headers.find((h) => !used.has(h) && (pass === "exact" ? h === m : h.startsWith(m + "_")));
        if (hit) {
          out[col.key] = hit;
          used.add(hit);
          break;
        }
      }
    }
  }
  return out;
}

const plain = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

export const PARTNER_KIND_EXCEL: Record<PartnerFormKind, string> = {
  DOI_TAC: "Đối tác",
  NOI_BO: "Nội bộ",
};

/**
 * Ô Loại → { kind: loại người dùng thấy (null = suy theo mã), dbKind: loại database ghi
 * thẳng (null = mới thì CA_HAI, sửa thì giữ nguyên) }. Chữ cũ của file KiotViet
 * ("Nhà cung cấp", "Khách hàng", "Cả hai") vẫn nhận và giữ đúng loại database đó.
 * Trống → null; lạ → "INVALID".
 */
export function parsePartnerKind(
  text: string,
): { kind: PartnerFormKind | null; dbKind: PartnerKind | null } | null | "INVALID" {
  const t = plain(text);
  if (t === "") return null;
  if (t === "nb" || t.startsWith("noi bo")) return { kind: "NOI_BO", dbKind: null };
  if (t.startsWith("doi tac")) return { kind: "DOI_TAC", dbKind: null };
  if (t === "ncc" || t.startsWith("nha cung cap")) return { kind: null, dbKind: "NCC" };
  if (t === "kh" || t === "khach" || t.startsWith("khach hang")) return { kind: null, dbKind: "KHACH" };
  if (t.startsWith("ca hai") || t === "ca_hai") return { kind: null, dbKind: "CA_HAI" };
  return "INVALID";
}

/** 1 / Có / x / true → true; 0 / Không / false → false; trống → null; lạ → "INVALID". */
export function parseActiveFlag(value: unknown): boolean | null | "INVALID" {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 0 ? false : value === 1 ? true : "INVALID";
  const t = plain(String(value));
  if (t === "") return null;
  if (["1", "co", "x", "true", "dang hoat dong"].includes(t)) return true;
  if (["0", "khong", "false", "ngung"].includes(t)) return false;
  return "INVALID";
}

/** Một dòng gửi RPC nhap_doi_tac_excel — khóa snake_case là hợp đồng jsonb. */
export type PartnerRpcRow = {
  dong: number;
  ma: string | null;
  ten: string | null;
  loai: PartnerKind | null;
  dien_thoai: string | null;
  email: string | null;
  dia_chi: string | null;
  khu_vuc: string | null;
  phuong_xa: string | null;
  ma_so_thue: string | null;
  ghi_chu: string | null;
  dang_hoat_dong: boolean | null;
};
