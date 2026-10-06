/**
 * Excel đối tác phía server. Lớp api: chỗ duy nhất của phần này chạm tên RPC / cột
 * tiếng Việt. Chạy bằng phiên người dùng — RLS và policy "them/sua doi tac" chặn thật.
 */
import { z } from "zod";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { ExcelImportMode, ExcelImportResult, ImportIssue } from "@/shared/lib/excel-import";
import type { Json } from "@/types/database.types";

import type { PartnerRpcRow } from "../lib/partner-excel";
import { readPartnerFilterFromUrl } from "../lib/partner-filter-url";
import { toPartnerDetail, type PartnerDetail } from "../types";

const DETAIL_COLUMNS =
  "id, ma, ten, loai, dien_thoai, email, dia_chi, khu_vuc, phuong_xa, ma_so_thue, ghi_chu, dang_hoat_dong, created_at, updated_at";
/** Trần trang của danh_sach_doi_tac. */
const PAGE_SIZE = 200;

const issueSchema = z.object({ dong: z.number().nullable(), so: z.string().nullable(), loi: z.string() });
const rpcResultSchema = z.object({
  committed: z.boolean(),
  moi: z.number(),
  sua: z.number(),
  loi: z.array(issueSchema),
});

const toIssue = (i: z.infer<typeof issueSchema>): ImportIssue => ({ row: i.dong ?? 0, docNo: i.so ?? "", message: i.loi });

async function callRpc(mode: ExcelImportMode, rows: PartnerRpcRow[], checkOnly: boolean) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("nhap_doi_tac_excel", {
    p_kieu: mode,
    p_dong: rows as unknown as Json,
    p_chi_kiem_tra: checkOnly,
  });
  if (error) throw error;
  return rpcResultSchema.parse(data);
}

/** Kiểm tra (`commit` false) hoặc nạp. Đối tác ít nên một lần gọi là đủ, không chia lô. */
export async function importPartners(
  mode: ExcelImportMode,
  rows: PartnerRpcRow[],
  localIssues: ImportIssue[],
  commit: boolean,
): Promise<ExcelImportResult> {
  const result: ExcelImportResult = {
    committed: false,
    documents: rows.length,
    lines: 0,
    created: 0,
    updated: 0,
    errors: [...localIssues],
    warnings: [],
    partial: null,
  };
  const check = await callRpc(mode, rows, true);
  result.errors.push(...check.loi.map(toIssue));
  result.errors.sort((a, b) => a.row - b.row);
  if (!commit || result.errors.length > 0 || rows.length === 0) return result;

  const done = await callRpc(mode, rows, false);
  if (!done.committed) {
    result.errors.push(...done.loi.map(toIssue));
    return result;
  }
  return { ...result, committed: true, created: done.moi, updated: done.sua };
}

/**
 * Đối tác đang hiện trên màn Đối tác theo đúng bộ lọc URL (cùng RPC danh_sach_doi_tac
 * của màn danh sách), đủ cột chi tiết — cho file xuất và file mẫu cập nhật.
 */
export async function fetchListedPartners(params: URLSearchParams): Promise<PartnerDetail[]> {
  // Màn Đối tác bỏ lọc theo loại (partner-table) — xuất cũng vậy.
  const filter = { ...readPartnerFilterFromUrl(params), kind: null };
  const supabase = await createSupabaseServerClient();

  const ids: string[] = [];
  for (let page = 1; ; page += 1) {
    const { data, error } = await supabase.rpc("danh_sach_doi_tac", {
      p_tu_khoa: filter.q || undefined,
      // "tất cả" phải gửi null tường minh, bỏ trống thì RPC mặc định chỉ lấy đang hoạt động.
      ...(filter.activeStatus === "all"
        ? { p_dang_hoat_dong: null as unknown as boolean }
        : { p_dang_hoat_dong: filter.activeStatus === "active" }),
      p_trang: page,
      p_kich_thuoc: PAGE_SIZE,
    });
    if (error) throw error;
    const rows = data ?? [];
    ids.push(...rows.map((r) => r.id));
    if (rows.length < PAGE_SIZE) break;
  }
  if (ids.length === 0) return [];

  const details: PartnerDetail[] = [];
  for (let i = 0; i < ids.length; i += PAGE_SIZE) {
    const { data, error } = await supabase
      .from("doi_tac")
      .select(DETAIL_COLUMNS)
      .in("id", ids.slice(i, i + PAGE_SIZE));
    if (error) throw error;
    details.push(...(data ?? []).map(toPartnerDetail));
  }
  const order = new Map(ids.map((id, i) => [id, i]));
  return details.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}
