/**
 * Chứng từ đang hiện trên màn danh sách theo đúng bộ lọc URL → các dòng Excel cùng
 * cột với file mẫu. Dùng cho "Excel" (xuất) và "Tải mẫu cập nhật" (đủ thông tin để
 * sửa rồi nhập lại). Một lần gọi RPC: xuat_excel_chung_tu (0105) cho hóa đơn / phiếu
 * nhập, xuat_excel_don_dat (0107) cho đơn đặt — cùng quy tắc lọc với màn danh sách.
 * Lớp api: chỗ duy nhất chạm khóa jsonb tiếng Việt.
 */
import { z } from "zod";

import { NEGATIVE_REASON_LABELS } from "@/features/documents/lib/negative-reasons";
import { DOC_STATUS_LABELS } from "@/features/documents/types";
import { readOrderFilterFromUrl, toOrderListRpcArgs } from "@/features/sales-order/schemas/order.schema";
import { readReceiptFilterFromUrl, toReceiptListRpcArgs } from "@/features/stock-in/schemas/receipt.schema";
import { readIssueFilterFromUrl, toIssueListRpcArgs } from "@/features/stock-out/schemas/issue.schema";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { DocumentKind } from "../lib/document-excel";
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
  nguoi_nhap: z.string().nullable(),
  nguoi_tao: z.string().nullable(),
  trang_thai: z.enum(["NHAP_LIEU", "HOAN_THANH", "DA_HUY"]),
});
const resultSchema = z.object({ tong: z.number(), dong: z.array(rowSchema) });

const orderRowSchema = z.object({
  so: z.string(),
  ngay: z.string(),
  ngay_giao: z.string().nullable(),
  ma_doi_tac: z.string().nullable(),
  ghi_chu: z.string().nullable(),
  nv_phieu: z.string().nullable(),
  ma_hang: z.string().nullable(),
  so_luong: z.coerce.number().nullable(),
  nv_dong: z.string().nullable(),
  ghi_chu_dong: z.string().nullable().optional(),
});
const orderResultSchema = z.object({ tong: z.number(), dong: z.array(orderRowSchema) });

const toDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

async function fetchOrderRows(params: URLSearchParams): Promise<ExportRows> {
  const list = toOrderListRpcArgs(readOrderFilterFromUrl(params));
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("xuat_excel_don_dat", {
    p_trang_thai: list.p_trang_thai,
    p_doi_tac_id: list.p_doi_tac_id,
    p_tu_ngay: list.p_tu_ngay,
    p_den_ngay: list.p_den_ngay,
    p_tu_khoa: list.p_tu_khoa,
    p_loai_nhan: list.p_loai_nhan,
    p_nguoi_nhan_id: list.p_nguoi_nhan_id,
    p_toi_da: MAX_EXPORT,
  });
  if (error) throw error;
  const result = orderResultSchema.parse(data);
  return {
    total: result.tong,
    rows: result.dong.map((r) => ({
      docNo: r.so,
      date: toDate(r.ngay),
      dueDate: toDate(r.ngay_giao),
      partnerCode: r.ma_doi_tac,
      note: r.ghi_chu,
      staff: r.nv_dong ?? r.nv_phieu,
      productCode: r.ma_hang,
      quantity: r.so_luong,
      lineNote: r.ghi_chu_dong ?? null,
    })),
  };
}

export type ExportRows = { total: number; rows: TemplateRow[] };

const reasonLabels = NEGATIVE_REASON_LABELS as Record<string, string>;

export async function fetchFilteredRows(kind: DocumentKind, params: URLSearchParams): Promise<ExportRows> {
  return kind === "don-dat" ? fetchOrderRows(params) : fetchDocumentRows(kind, params);
}

async function fetchDocumentRows(kind: "hoa-don" | "phieu-nhap", params: URLSearchParams): Promise<ExportRows> {
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
      date: toDate(r.ngay),
      orderNo: r.ma_dat_hang,
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
      receiver: r.nguoi_nhap,
      createdBy: r.nguoi_tao,
      status: DOC_STATUS_LABELS[r.trang_thai],
    })),
  };
}
