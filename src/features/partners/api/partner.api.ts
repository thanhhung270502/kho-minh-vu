import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Page } from "@/shared/types";

import { toPartnerInsert, type PartnerInput } from "../schemas/partner.schema";
import {
  toPartnerDetail,
  toPartnerRow,
  toTransactionRow,
  type PartnerDetail,
  type PartnerFilter,
  type PartnerKind,
  type PartnerRow,
  type TransactionRow,
} from "../types";

const DETAIL_COLUMNS =
  "id, ma, ten, loai, dien_thoai, email, dia_chi, khu_vuc, phuong_xa, ma_so_thue, ghi_chu, dang_hoat_dong, created_at, updated_at";

export async function fetchPartners(
  filter: PartnerFilter,
): Promise<Page<PartnerRow>> {
  const { data, error } = await getSupabaseBrowserClient().rpc("danh_sach_doi_tac", {
    p_tu_khoa: filter.q || undefined,
    p_loai: filter.kind ?? undefined,
    // "tất cả" phải gửi null tường minh, bỏ trống thì RPC mặc định chỉ lấy đang hoạt động.
    ...(filter.activeStatus === "all"
      ? { p_dang_hoat_dong: null as unknown as boolean }
      : { p_dang_hoat_dong: filter.activeStatus === "active" }),
    p_trang: filter.page,
    p_kich_thuoc: 50,
  });
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toPartnerRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

export async function fetchPartnerDetail(id: string): Promise<PartnerDetail | null> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("doi_tac")
    .select(DETAIL_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data ? toPartnerDetail(data) : null;
}

export async function suggestPartnerCode(kind: PartnerKind): Promise<string> {
  const { data, error } = await getSupabaseBrowserClient().rpc("sinh_ma_doi_tac", {
    p_loai: kind,
  });
  if (error) throw error;
  return data ?? "";
}

export async function savePartner(
  id: string | null,
  input: PartnerInput,
): Promise<string> {
  const supabase = getSupabaseBrowserClient();
  const payload = toPartnerInsert(input);

  if (id) {
    const { error } = await supabase.from("doi_tac").update(payload).eq("id", id);
    if (error) throw error;
    return id;
  }

  const { data, error } = await supabase
    .from("doi_tac")
    .insert(payload)
    .select("id")
    .single();
  if (error) throw error;
  return data.id;
}

export async function fetchTransactionHistory(
  partnerId: string,
  page: number,
): Promise<Page<TransactionRow>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "lich_su_giao_dich_doi_tac",
    { p_doi_tac_id: partnerId, p_trang: page, p_kich_thuoc: 50 },
  );
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toTransactionRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}
