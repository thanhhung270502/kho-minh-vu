import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import type { Page } from "@/shared/types";
import type { Database, Json } from "@/types/database.types";

import { toPartnerRow, type PartnerRow } from "../types";

type NoteRowDb =
  Database["public"]["Functions"]["danh_sach_ghi_chu_kiotviet"]["Returns"][number];

/** Giá trị gửi cho RPC `quyet_ghi_chu` — hợp đồng database, giữ nguyên. */
export type NoteDecisionKind = "KHACH" | "SALE" | "KHACH_VA_SALE" | "BO_QUA";

/** Giá trị gửi cho RPC `danh_sach_ghi_chu_kiotviet` — hợp đồng database. */
export type NoteReviewStatus = "chua_ra" | "da_ra";

export type NoteRow = {
  value: string;
  kind: string;
  partnerId: string | null;
  partnerName: string | null;
  salesName: string | null;
  invoiceCount: number;
  sampleInvoices: string[];
  firstDate: string;
  lastDate: string;
  totalRows: number;
};

export type NoteFilter = {
  status: NoteReviewStatus;
  q: string;
  page: number;
};

export const DEFAULT_NOTE_FILTER: NoteFilter = {
  status: "chua_ra",
  q: "",
  page: 1,
};

const PAGE_SIZE = 30;

export const noteReviewKeys = {
  all: ["note-review"] as const,
  list: (filter: NoteFilter) => ["note-review", "list", filter] as const,
  counts: ["note-review", "counts"] as const,
  customerSearch: (q: string) => ["note-review", "customer-search", q] as const,
};

function toNoteRow(row: NoteRowDb): NoteRow {
  return {
    value: row.gia_tri,
    kind: row.loai,
    partnerId: row.doi_tac_id,
    partnerName: row.ten_doi_tac,
    salesName: row.ten_sale,
    invoiceCount: Number(row.so_hoa_don),
    sampleInvoices: row.hoa_don_mau ?? [],
    firstDate: row.ngay_dau,
    lastDate: row.ngay_cuoi,
    totalRows: Number(row.tong_so_dong),
  };
}

export async function fetchNotes(filter: NoteFilter): Promise<Page<NoteRow>> {
  const { data, error } = await getSupabaseBrowserClient().rpc(
    "danh_sach_ghi_chu_kiotviet",
    {
      p_trang_thai: filter.status,
      p_tu_khoa: filter.q || undefined,
      p_trang: filter.page,
      p_kich_thuoc: PAGE_SIZE,
    },
  );
  if (error) throw error;

  const raw = data ?? [];
  return {
    rows: raw.map(toNoteRow),
    total: Number(raw[0]?.tong_so_dong ?? 0),
  };
}

/** Thanh tiến độ cần cả hai con số; hỏi song song cho nhanh. */
export async function fetchNoteCounts(): Promise<{
  pending: number;
  total: number;
}> {
  const supabase = getSupabaseBrowserClient();

  const [pending, all] = await Promise.all([
    supabase.rpc("danh_sach_ghi_chu_kiotviet", {
      p_trang_thai: "chua_ra",
      p_trang: 1,
      p_kich_thuoc: 1,
    }),
    supabase.rpc("danh_sach_ghi_chu_kiotviet", { p_trang: 1, p_kich_thuoc: 1 }),
  ]);

  if (pending.error) throw pending.error;
  if (all.error) throw all.error;

  return {
    pending: Number(pending.data?.[0]?.tong_so_dong ?? 0),
    total: Number(all.data?.[0]?.tong_so_dong ?? 0),
  };
}

export type NoteDecision = {
  value: string;
  kind: NoteDecisionKind;
  partnerId?: string;
  /** Khóa là tên cột `doi_tac` — RPC nhận jsonb theo đúng hợp đồng đó. */
  newCustomer?: { ma?: string; ten: string; dien_thoai?: string | null };
  salesName?: string;
};

export async function decideNote(decision: NoteDecision): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("quyet_ghi_chu", {
    p_gia_tri: decision.value,
    p_loai: decision.kind,
    p_doi_tac_id: decision.partnerId,
    p_tao_khach: decision.newCustomer
      ? (decision.newCustomer as unknown as Json)
      : undefined,
    p_ten_sale: decision.salesName,
  });
  if (error) throw error;
}

export async function undoNoteDecision(value: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("bo_quyet_ghi_chu", {
    p_gia_tri: value,
  });
  if (error) throw error;
}

/** Ô "Gộp vào khách" — tìm trong khách hàng đang hoạt động. */
export async function searchCustomers(q: string): Promise<PartnerRow[]> {
  const { data, error } = await getSupabaseBrowserClient().rpc("danh_sach_doi_tac", {
    p_tu_khoa: q || undefined,
    p_loai: "KHACH",
    p_dang_hoat_dong: true,
    p_trang: 1,
    p_kich_thuoc: 20,
  });
  if (error) throw error;
  return (data ?? []).map(toPartnerRow);
}
