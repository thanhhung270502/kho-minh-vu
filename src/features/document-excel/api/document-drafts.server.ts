/**
 * Phiếu còn nháp → các dòng của "file mẫu cập nhật". Lớp api: chỗ duy nhất của
 * feature chạm tên bảng/cột tiếng Việt. Chạy bằng phiên của người dùng (RLS).
 *
 * Truy vấn phẳng rồi ghép ở đây thay vì nhúng (embed) PostgREST: don_dat_hang có
 * hai đường tới nhan_vien_phu_trach (cột cũ + bảng nối) nên embed bị mơ hồ, và
 * san_pham chỉ cấp quyền đọc theo cột (bẫy 5).
 */
import { NEGATIVE_REASON_LABELS } from "@/features/documents/lib/negative-reasons";
import { createSupabaseServerClient } from "@/lib/supabase/server";

import type { DocumentKind } from "../lib/document-excel";
import type { TemplateRow } from "../lib/document-excel-file.server";

/** Mẫu cập nhật chỉ là bản sao để sửa — giới hạn để file không quá nặng. */
export const MAX_DRAFTS = 500;
const CHUNK = 100;

type Client = Awaited<ReturnType<typeof createSupabaseServerClient>>;

function chunks<T>(list: readonly T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += CHUNK) out.push(list.slice(i, i + CHUNK));
  return out;
}

async function lookupMaps(supabase: Client, partnerIds: string[], productIds: string[]) {
  const partners = new Map<string, string>();
  for (const ids of chunks([...new Set(partnerIds)])) {
    const { data, error } = await supabase.from("doi_tac").select("id, ma").in("id", ids);
    if (error) throw error;
    for (const p of data ?? []) partners.set(p.id, p.ma);
  }
  const products = new Map<string, string>();
  for (const ids of chunks([...new Set(productIds)])) {
    const { data, error } = await supabase.from("san_pham").select("id, ma_hang").in("id", ids);
    if (error) throw error;
    for (const p of data ?? []) products.set(p.id, p.ma_hang);
  }
  const { data: staffRows, error: staffError } = await supabase
    .from("nhan_vien_phu_trach")
    .select("id, ten_viet_tat");
  if (staffError) throw staffError;
  const staff = new Map((staffRows ?? []).map((s) => [s.id, s.ten_viet_tat]));
  const { data: whRows, error: whError } = await supabase.from("kho").select("id, ma");
  if (whError) throw whError;
  const warehouses = new Map((whRows ?? []).map((k) => [k.id, k.ma]));
  return { partners, products, staff, warehouses };
}

const toDate = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00Z`) : null);

async function orderDrafts(supabase: Client): Promise<TemplateRow[]> {
  const { data: heads, error } = await supabase
    .from("don_dat_hang")
    .select("id, so_dh, ngay_dh, ngay_giao_du_kien, ghi_chu, doi_tac_id")
    .eq("trang_thai", "TAM")
    .order("so_dh")
    .limit(MAX_DRAFTS);
  if (error) throw error;
  const ids = (heads ?? []).map((h) => h.id);

  const lines: { don_dat_hang_id: string; san_pham_id: string; so_luong_dat: number; nguoi_nhan_id: string | null }[] = [];
  const recipients: { don_dat_hang_id: string; nguoi_nhan_id: string; thu_tu: number }[] = [];
  for (const part of chunks(ids)) {
    const l = await supabase
      .from("don_dat_hang_dong")
      .select("don_dat_hang_id, san_pham_id, so_luong_dat, nguoi_nhan_id")
      .in("don_dat_hang_id", part)
      .order("created_at");
    if (l.error) throw l.error;
    lines.push(...(l.data ?? []));
    const r = await supabase
      .from("don_dat_hang_nguoi_nhan")
      .select("don_dat_hang_id, nguoi_nhan_id, thu_tu")
      .in("don_dat_hang_id", part);
    if (r.error) throw r.error;
    recipients.push(...(r.data ?? []));
  }

  const maps = await lookupMaps(
    supabase,
    (heads ?? []).flatMap((h) => (h.doi_tac_id ? [h.doi_tac_id] : [])),
    lines.map((l) => l.san_pham_id),
  );

  const rows: TemplateRow[] = [];
  for (const h of heads ?? []) {
    const staffNames = recipients
      .filter((r) => r.don_dat_hang_id === h.id)
      .sort((a, b) => a.thu_tu - b.thu_tu)
      .map((r) => maps.staff.get(r.nguoi_nhan_id) ?? "");
    const head: TemplateRow = {
      docNo: h.so_dh,
      date: toDate(h.ngay_dh),
      dueDate: toDate(h.ngay_giao_du_kien),
      recipientKind: h.doi_tac_id ? "Đối tác" : "Nội bộ",
      partnerCode: h.doi_tac_id ? (maps.partners.get(h.doi_tac_id) ?? null) : null,
      note: h.ghi_chu,
    };
    const own = lines.filter((l) => l.don_dat_hang_id === h.id);
    if (own.length === 0) rows.push({ ...head, staff: staffNames.join(" - ") || null });
    for (const l of own) {
      rows.push({
        ...head,
        staff: l.nguoi_nhan_id ? (maps.staff.get(l.nguoi_nhan_id) ?? null) : staffNames.join(" - ") || null,
        productCode: maps.products.get(l.san_pham_id) ?? null,
        quantity: Number(l.so_luong_dat),
      });
    }
  }
  return rows;
}

async function documentDrafts(supabase: Client, kind: "hoa-don" | "phieu-nhap"): Promise<TemplateRow[]> {
  const { data: heads, error } = await supabase
    .from("chung_tu")
    .select("id, so_ct, ngay_ct, kho_id, doi_tac_id, nguon_nhap, don_dat_hang_id, ghi_chu, ly_do_xuat_am, ghi_chu_ly_do")
    .eq("loai_ct", kind === "hoa-don" ? "XUAT" : "NHAP")
    .eq("trang_thai", "NHAP_LIEU")
    .order("so_ct")
    .limit(MAX_DRAFTS);
  if (error) throw error;
  const ids = (heads ?? []).map((h) => h.id);

  const lines: { chung_tu_id: string; san_pham_id: string; so_luong: number; ghi_chu: string | null; nguoi_nhan_id: string | null }[] = [];
  const recipients: { chung_tu_id: string; nguoi_nhan_id: string; thu_tu: number }[] = [];
  for (const part of chunks(ids)) {
    const l = await supabase
      .from("chung_tu_dong")
      .select("chung_tu_id, san_pham_id, so_luong, ghi_chu, nguoi_nhan_id")
      .in("chung_tu_id", part)
      .order("created_at");
    if (l.error) throw l.error;
    lines.push(...(l.data ?? []));
    if (kind === "hoa-don") {
      const r = await supabase
        .from("chung_tu_nguoi_nhan")
        .select("chung_tu_id, nguoi_nhan_id, thu_tu")
        .in("chung_tu_id", part);
      if (r.error) throw r.error;
      recipients.push(...(r.data ?? []));
    }
  }

  const orderNos = new Map<string, string>();
  const orderIds = [...new Set((heads ?? []).flatMap((h) => (h.don_dat_hang_id ? [h.don_dat_hang_id] : [])))];
  for (const part of chunks(orderIds)) {
    const { data, error: e } = await supabase.from("don_dat_hang").select("id, so_dh").in("id", part);
    if (e) throw e;
    for (const o of data ?? []) orderNos.set(o.id, o.so_dh);
  }

  const maps = await lookupMaps(
    supabase,
    (heads ?? []).flatMap((h) => (h.doi_tac_id ? [h.doi_tac_id] : [])),
    lines.map((l) => l.san_pham_id),
  );
  const reasonLabels = NEGATIVE_REASON_LABELS as Record<string, string>;

  const rows: TemplateRow[] = [];
  for (const h of heads ?? []) {
    const staffNames = recipients
      .filter((r) => r.chung_tu_id === h.id)
      .sort((a, b) => a.thu_tu - b.thu_tu)
      .map((r) => maps.staff.get(r.nguoi_nhan_id) ?? "");
    const head: TemplateRow = {
      docNo: h.so_ct,
      date: toDate(h.ngay_ct),
      orderNo: h.don_dat_hang_id ? (orderNos.get(h.don_dat_hang_id) ?? null) : null,
      recipientKind: kind === "hoa-don" ? (h.doi_tac_id ? "Đối tác" : "Nội bộ") : null,
      partnerCode: h.doi_tac_id ? (maps.partners.get(h.doi_tac_id) ?? null) : null,
      source: h.nguon_nhap === "NHA_MAY" ? "Nhà máy" : "NCC",
      warehouse: maps.warehouses.get(h.kho_id) ?? null,
      note: h.ghi_chu,
      negativeReason: h.ly_do_xuat_am
        ? (h.ly_do_xuat_am === "KHAC" && h.ghi_chu_ly_do ? h.ghi_chu_ly_do : (reasonLabels[h.ly_do_xuat_am] ?? h.ly_do_xuat_am))
        : null,
    };
    const own = lines.filter((l) => l.chung_tu_id === h.id);
    if (own.length === 0) rows.push({ ...head, staff: staffNames.join(" - ") || null });
    for (const l of own) {
      rows.push({
        ...head,
        staff: l.nguoi_nhan_id ? (maps.staff.get(l.nguoi_nhan_id) ?? null) : staffNames.join(" - ") || null,
        productCode: maps.products.get(l.san_pham_id) ?? null,
        quantity: Number(l.so_luong),
        lineNote: l.ghi_chu,
      });
    }
  }
  return rows;
}

export async function fetchDraftRows(kind: DocumentKind): Promise<TemplateRow[]> {
  const supabase = await createSupabaseServerClient();
  return kind === "don-dat" ? orderDrafts(supabase) : documentDrafts(supabase, kind);
}
