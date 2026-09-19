import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/types/database.types";

export type DocType = Database["public"]["Enums"]["loai_ct"];

type DocNumberingRowDb =
  Database["public"]["Functions"]["danh_sach_cau_hinh_so_ct"]["Returns"][number];

export type DocNumberingRow = {
  docType: DocType;
  /** Giá trị cột `nguon` — rỗng là dòng gốc của loại, "NHA_MAY" là dòng nhà máy. */
  source: string;
  prefix: string;
  digits: number;
  current: number;
  example: string;
};

export const DOC_TYPE_LABELS: Record<DocType, string> = {
  NHAP: "Phiếu nhập",
  XUAT: "Phiếu xuất",
  TRA_NCC: "Trả hàng NCC",
  TRA_KHACH: "Khách trả hàng",
  CHUYEN_KHO: "Chuyển kho",
  KIEM_KE: "Kiểm kê",
  DIEU_CHINH: "Điều chỉnh",
};

/** Nhãn hiển thị: loại + nguồn (nguồn rỗng = dòng gốc của loại). */
export function docNumberingLabel(docType: DocType, source: string): string {
  return source === "NHA_MAY"
    ? `${DOC_TYPE_LABELS[docType]} · nhà máy`
    : DOC_TYPE_LABELS[docType];
}

function toDocNumberingRow(row: DocNumberingRowDb): DocNumberingRow {
  return {
    docType: row.loai_ct,
    source: row.nguon,
    prefix: row.tien_to,
    digits: Number(row.so_chu_so),
    current: Number(row.so_hien_tai),
    example: row.vi_du,
  };
}

export async function fetchDocNumbering(): Promise<DocNumberingRow[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_cau_hinh_so_ct",
  );
  if (error) throw error;
  return (data ?? []).map(toDocNumberingRow);
}

export async function saveDocNumbering(
  docType: DocType,
  source: string,
  values: { prefix: string; digits: number },
): Promise<void> {
  // Không có policy khớp thì PostgREST trả 0 dòng chứ không báo lỗi — đếm để biết.
  // PHẢI lọc cả `nguon`: từ 0043 một loại có thể có nhiều dòng (NHAP có thêm
  // dòng nhà máy), lọc thiếu là sửa nhầm cả hai và vi phạm unique tiền tố.
  const { error, count } = await getSupabaseBrowserClient()
    .from("cau_hinh_so_ct")
    .update(
      { tien_to: values.prefix, so_chu_so: values.digits },
      { count: "exact" },
    )
    .eq("loai_ct", docType)
    .eq("nguon", source);

  if (error) throw error;
  if (!count) {
    throw new Error("Không lưu được — chỉ quản lý sửa được quy tắc đánh số.");
  }
}

/** Cùng công thức với `sinh_so_ct` ở database, để ví dụ đổi ngay lúc gõ. */
export function nextDocNoExample(
  prefix: string,
  digits: number,
  current: number,
): string {
  const year = String(new Date().getFullYear() % 100).padStart(2, "0");
  return `${prefix}${year}-${String(current + 1).padStart(digits, "0")}`;
}
