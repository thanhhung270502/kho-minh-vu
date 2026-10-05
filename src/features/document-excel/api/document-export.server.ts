/**
 * Hóa đơn / phiếu nhập đang hiện trên màn Duyệt đơn / Nhập kho theo đúng bộ lọc URL
 * → các dòng Excel. Một lần gọi RPC xuat_excel_chung_tu (0105): cùng quy tắc lọc và
 * phạm vi kho với danh_sach_chung_tu. Lớp api: chỗ duy nhất chạm khóa jsonb tiếng Việt.
 */
import { z } from "zod";

import { NEGATIVE_REASON_LABELS } from "@/features/documents/lib/negative-reasons";
import { readReceiptFilterFromUrl, toReceiptListRpcArgs } from "@/features/stock-in/schemas/receipt.schema";
import { readIssueFilterFromUrl, toIssueListRpcArgs } from "@/features/stock-out/schemas/issue.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { TemplateRow } from "../lib/document-excel-file.server";

/** Đủ cả lịch sử hóa đơn hiện có (~8.900 phiếu, ~42.000 dòng). */
export const MAX_EXPORT = 10_000;

const rowSchema = z.object({
  so: z.string(),
  ngay: z.string(),
  ma_dat_hang: z.string().nullable(),
  ma_doi_tac: z.string().nullable(),
  nguon: z.string().nullable(),
  ma_kho: z.string().nullable(),
  ghi_chu: z.string().nullable(),
  ly_do_xuat_am: z.string().nullable(),
  ghi_chu_ly_do: z.string().nullable(),
  nv_phieu: z.string().nullable(),
  ma_hang: z.string().nullable(),
  so_luong: z.coerce.number().nullable(),
  ghi_chu_dong: z.string().nullable(),
  nv_dong: z.string().nullable(),
});
const resultSchema = z.object({ tong: z.number(), dong: z.array(rowSchema) });

export type ExportRows = { total: number; rows: TemplateRow[] };

const reasonLabels = NEGATIVE_REASON_LABELS as Record<string, string>;

export async function fetchExportRows(kind: "hoa-don" | "phieu-nhap", params: URLSearchParams): Promise<ExportRows> {
  // Bộ lọc của chính màn danh sách; bỏ phân trang — xuất mọi phiếu khớp lọc.
  const list =
    kind === "hoa-don"
      ? toIssueListRpcArgs(readIssueFilterFromUrl(params))
      : toReceiptListRpcArgs(readReceiptFilterFromUrl(params));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("xuat_excel_chung_tu", {
    p_loai_ct: kind === "hoa-don" ? "XUAT" : "NHAP",
    p_trang_thai: list.p_trang_thai,
    p_doi_tac_id: list.p_doi_tac_id,
    p_kho_id: list.p_kho_id,
    p_nguon_nhap: list.p_nguon_nhap,
    p_tu_ngay: list.p_tu_ngay,
    p_den_ngay: list.p_den_ngay,
    p_tu_khoa: list.p_tu_khoa,
    p_toi_da: MAX_EXPORT,
  });
  if (error) throw error;
  const result = resultSchema.parse(data);

  return {
    total: result.tong,
    rows: result.dong.map((r) => ({
      docNo: r.so,
      date: new Date(`${r.ngay}T00:00:00Z`),
      orderNo: r.ma_dat_hang,
      recipientKind: kind === "hoa-don" ? (r.ma_doi_tac ? "Đối tác" : "Nội bộ") : null,
      partnerCode: r.ma_doi_tac,
      source: r.nguon === "NHA_MAY" ? "Nhà máy" : "NCC",
      warehouse: r.ma_kho,
      note: r.ghi_chu,
      negativeReason: r.ly_do_xuat_am
        ? r.ly_do_xuat_am === "KHAC" && r.ghi_chu_ly_do
          ? r.ghi_chu_ly_do
          : (reasonLabels[r.ly_do_xuat_am] ?? r.ly_do_xuat_am)
        : null,
      staff: r.nv_dong ?? r.nv_phieu,
      productCode: r.ma_hang,
      quantity: r.so_luong,
      lineNote: r.ghi_chu_dong,
    })),
  };
}
