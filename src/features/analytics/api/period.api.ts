import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import type { DateRange, SeriesStep } from "../lib/period";
import type { FlowPoint, PeriodRow } from "../types";

/**
 * Hai RPC 0099. `phan_tich_theo_ky` trả một mảng jsonb (né giới hạn 1000 dòng của
 * PostgREST) nên kiểu sinh ra chỉ là `Json` — vẫn kiểm dạng bằng zod. Khóa
 * snake_case là hợp đồng jsonb với RPC.
 */
const num = z.coerce.number();

const periodRowSchema = z.object({
  san_pham_id: z.string(),
  ma_hang: z.string(),
  ten_hang: z.string(),
  nhom_hang_id: z.string().nullable(),
  ten_nhom_hang: z.string().nullable(),
  loai_hang: z.string(),
  dang_kinh_doanh: z.boolean(),
  ten_dvt: z.string().nullable(),
  hang_xe: z.string().nullable(),
  dong_xe: z.string().nullable(),
  xe_dung_chung: z.array(z.object({ hang: z.string(), dong: z.string().nullable().optional() })).catch([]),
  linh_kien: z.string().nullable(),
  cong_doan_id: z.string().nullable(),
  ten_cong_doan: z.string().nullable(),
  ton_dau: num,
  nhap: num,
  xuat_ban: num,
  xuat_noi_bo: num,
  tra: num,
  dieu_chinh: num,
  ton_cuoi: num,
  nhap_ky_truoc: num,
  xuat_ban_ky_truoc: num,
});

export async function fetchPeriodRows(range: DateRange, warehouseId: string | null): Promise<PeriodRow[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("phan_tich_theo_ky", {
    p_tu: range.from,
    p_den: range.to,
    p_kho_id: warehouseId ?? undefined,
  });
  if (error) throw error;
  return z.array(periodRowSchema).parse(data ?? []).map((r) => ({
    productId: r.san_pham_id,
    code: r.ma_hang,
    name: r.ten_hang,
    categoryId: r.nhom_hang_id,
    categoryName: r.ten_nhom_hang,
    isCombo: r.loai_hang === "COMBO",
    isActive: r.dang_kinh_doanh,
    unitName: r.ten_dvt,
    brandCode: r.hang_xe,
    modelCode: r.dong_xe,
    sharedVehicles: r.xe_dung_chung.map((v) => ({ brandCode: v.hang, modelCode: v.dong ?? null })),
    partCode: r.linh_kien,
    stageId: r.cong_doan_id,
    stageName: r.ten_cong_doan,
    openingStock: r.ton_dau,
    received: r.nhap,
    sold: r.xuat_ban,
    internalOut: r.xuat_noi_bo,
    returned: r.tra,
    adjusted: r.dieu_chinh,
    closingStock: r.ton_cuoi,
    receivedPrev: r.nhap_ky_truoc,
    soldPrev: r.xuat_ban_ky_truoc,
  }));
}

const flowSchema = z.object({
  ky: z.string(),
  nhap: num,
  xuat_ban: num,
  xuat_noi_bo: num,
  so_phieu_nhap: num,
  so_hoa_don: num,
});

/** productIds null = mọi mã; có danh sách = chỉ các mã còn lại sau bộ lọc. */
export async function fetchFlowSeries(
  range: DateRange,
  step: SeriesStep,
  warehouseId: string | null,
  productIds: string[] | null,
): Promise<FlowPoint[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("nhap_xuat_theo_ky", {
    p_tu: range.from,
    p_den: range.to,
    p_buoc: step,
    p_kho_id: warehouseId ?? undefined,
    p_san_pham_ids: productIds ?? undefined,
  });
  if (error) throw error;
  return z.array(flowSchema).parse(data ?? []).map((r) => ({
    date: r.ky,
    received: r.nhap,
    sold: r.xuat_ban,
    internalOut: r.xuat_noi_bo,
    receiptCount: r.so_phieu_nhap,
    invoiceCount: r.so_hoa_don,
  }));
}

/** Danh sách kho cho bộ lọc — bảng kho đọc được với mọi vai trò xem phân tích. */
export async function fetchWarehouses(): Promise<Array<{ id: string; name: string }>> {
  const { data, error } = await getSupabaseBrowserClient().from("kho").select("id, ten").order("ma");
  if (error) throw error;
  return (data ?? []).map((k) => ({ id: k.id, name: k.ten }));
}
