import type { SupabaseClient } from "@supabase/supabase-js";

import {
  defaultPeriodFilter,
  periodRange,
  seriesStep,
} from "@/features/analytics/lib/period";
import {
  readOrderFilterFromUrl,
  toOrderListRpcArgs,
  toOrderStatusCountRpcArgs,
} from "@/features/sales-order/schemas/order.schema";
import {
  readIssueFilterFromUrl,
  toIssueListRpcArgs,
} from "@/features/stock-out/schemas/issue.schema";
import { fetchAllPages } from "@/shared/lib/fetch-all-pages";
import type { Database } from "@/types/database.types";

import type { BenchRole } from "./stats";

type Client = SupabaseClient<Database>;

export type BenchCase = {
  id: string;
  rpc: string;
  roles: BenchRole[];
  params: unknown;
  /** Trả số dòng nhận về. Ném lỗi supabase-js nguyên dạng để runner đọc `.code`. */
  run: (client: Client) => Promise<number>;
  /** Chạy một lần cho mỗi vai trò, trước lượt làm nóng. */
  setup?: (client: Client, iterations: number) => Promise<void>;
  teardown?: (client: Client) => Promise<void>;
  /** Thiếu fixture BENCH → runner ghi `skipped`. */
  skipReason?: string;
};

// Hạn của lời gọi `.rpc()` sau `.range()` khi PostgREST cắt ở max_rows = 1000 (supabase/config.toml).
const PAGE_SIZE = 1000;

function rowsOf(res: { data: unknown; error: unknown }): number {
  // Lỗi PostgREST là object thường (bẫy 8): ném nguyên để runner đọc `.code`.
  if (res.error) throw res.error;
  if (Array.isArray(res.data)) return res.data.length;
  return res.data === null || res.data === undefined ? 0 : 1;
}

function addDays(iso: string, days: number): string {
  const [year = 0, month = 1, day = 1] = iso.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10);
}

function yymmdd(iso: string): string {
  return iso.slice(2, 4) + iso.slice(5, 7) + iso.slice(8, 10);
}

type Fixtures = {
  hotProductId: string | null;
  internalPartnerId: string | null;
  openSessionId: string | null;
  k1Id: string | null;
  draftProductIds: string[];
};

async function loadFixtures(admin: Client): Promise<Fixtures> {
  // Chỉ liệt kê cột (bẫy 5: san_pham không có SELECT mức bảng).
  const [products, partner, session, warehouse] = await Promise.all([
    admin
      .from("san_pham")
      .select("id, ma_hang")
      .in("ma_hang", ["BENCH-0001", "BENCH-0002", "BENCH-0003"]),
    admin.from("doi_tac").select("id").eq("ma", "NBBENCH").maybeSingle(),
    admin.from("chung_tu").select("id").eq("so_ct", "BENCH-KK-MO").maybeSingle(),
    admin.from("kho").select("id").eq("ma", "K1").maybeSingle(),
  ]);
  for (const res of [products, partner, session, warehouse]) {
    if (res.error) throw res.error;
  }
  const byCode = new Map((products.data ?? []).map((p) => [p.ma_hang, p.id]));
  return {
    hotProductId: byCode.get("BENCH-0001") ?? null,
    internalPartnerId: partner.data?.id ?? null,
    openSessionId: session.data?.id ?? null,
    k1Id: warehouse.data?.id ?? null,
    draftProductIds: ["BENCH-0001", "BENCH-0002", "BENCH-0003"].flatMap((code) => {
      const id = byCode.get(code);
      return id ? [id] : [];
    }),
  };
}

export async function buildCases(
  admin: Client,
  today: string,
): Promise<{ cases: BenchCase[]; missing: string[] }> {
  const fx = await loadFixtures(admin);
  const missing: string[] = [];
  const need = (value: string | null, name: string): string | undefined => {
    if (value === null) {
      if (!missing.includes(name)) missing.push(name);
      return undefined;
    }
    return value;
  };
  const skip = (name: string, present: boolean) =>
    present ? undefined : `thiếu fixture ${name}`;

  const hotProductId = need(fx.hotProductId, "BENCH-0001");
  const partnerId = need(fx.internalPartnerId, "NBBENCH");
  const sessionId = need(fx.openSessionId, "BENCH-KK-MO");
  const k1Id = need(fx.k1Id, "kho K1");
  if (fx.draftProductIds.length < 3) need(null, "BENCH-0001..0003");

  const soCtFrag = `HD${yymmdd(addDays(today, -3))}-04`;
  const soDhFrag = `DH${yymmdd(addDays(today, -3))}-04`;

  // Kỳ mặc định của trang Phân tích: tháng này (features/analytics/lib/period.ts defaultPeriodFilter).
  const periodFilter = defaultPeriodFilter(today);
  const range = periodRange(periodFilter.unit, periodFilter.anchor, today);
  const step = seriesStep(periodFilter.unit);

  // Trang Phân tích tải phan_tich_ton_kho kỳ 30 ngày: analysis-view.tsx CURRENT_PACE_DAYS.
  const paceDays = 30;

  // Hàm thật của frontend, rỗng = bộ lọc mặc định (tháng này).
  const orderFilter = readOrderFilterFromUrl(new URLSearchParams());
  const orderArgs = toOrderListRpcArgs(orderFilter);
  const orderCountArgs = toOrderStatusCountRpcArgs(orderFilter);
  const issueArgs = toIssueListRpcArgs(readIssueFilterFromUrl(new URLSearchParams()));

  const both: BenchRole[] = ["quan_ly", "thu_kho"];
  const manager: BenchRole[] = ["quan_ly"];

  const deleteLine = (() => {
    let documentId: string | null = null;
    let lineIds: string[] = [];
    const draftProducts = fx.draftProductIds;
    const c: BenchCase = {
      id: "xoa_dong_phieu_nhap",
      rpc: "chung_tu_dong.delete",
      roles: manager,
      // features/documents/api/document.api.ts:120 — deleteDocumentLine
      params: { table: "chung_tu_dong", op: "delete", eq: "id", count: "exact" },
      skipReason:
        k1Id && draftProducts.length === 3
          ? undefined
          : "thiếu fixture kho K1 / BENCH-0001..0003",
      setup: async (client, iterations) => {
        if (!k1Id) return;
        const header = await client
          .from("chung_tu")
          .insert({ so_ct: `BENCH-NHAP-${Date.now()}`, loai_ct: "NHAP", kho_id: k1Id })
          .select("id")
          .single();
        if (header.error) throw header.error;
        documentId = header.data.id;
        const lines = await client
          .from("chung_tu_dong")
          .insert(
            Array.from({ length: iterations + 1 }, (_, i) => ({
              chung_tu_id: header.data.id,
              san_pham_id: draftProducts[i % draftProducts.length] ?? "",
              so_luong: 1,
              don_gia: 0,
              thanh_tien: 0,
              kho_id: k1Id,
            })),
          )
          .select("id");
        if (lines.error) throw lines.error;
        lineIds = lines.data.map((l) => l.id);
      },
      run: async (client) => {
        const lineId = lineIds.shift();
        if (!lineId) throw new Error("Hết dòng nháp để xóa");
        // Có WHERE (bẫy 22: pg_safeupdate chặn DELETE trần qua PostgREST).
        const { error, count } = await client
          .from("chung_tu_dong")
          .delete({ count: "exact" })
          .eq("id", lineId);
        if (error) throw error;
        if (!count) throw new Error("Không xóa được dòng — phiếu đã ghi sổ hoặc thiếu quyền.");
        return count;
      },
      teardown: async (client) => {
        if (!documentId) return;
        // Nháp → DA_HUY, không đụng sổ cái.
        const { error } = await client.rpc("huy_chung_tu", {
          p_chung_tu_id: documentId,
          p_ly_do: "Bench: dọn nháp",
        });
        documentId = null;
        if (error) throw error;
      },
    };
    return c;
  })();

  const cases: BenchCase[] = [
    {
      id: "tong_quan_chi_so",
      rpc: "tong_quan_chi_so",
      roles: manager,
      // features/dashboard/api/dashboard.api.ts — fetchOverviewKpis, không tham số
      params: {},
      run: async (c) => rowsOf(await c.rpc("tong_quan_chi_so")),
    },
    {
      id: "phan_tich_ton_kho.trang_1",
      rpc: "phan_tich_ton_kho",
      roles: manager,
      params: { p_so_ngay: paceDays, range: [0, PAGE_SIZE - 1] },
      run: async (c) =>
        rowsOf(
          await c
            .rpc("phan_tich_ton_kho", { p_so_ngay: paceDays })
            .range(0, PAGE_SIZE - 1),
        ),
    },
    {
      id: "phan_tich_ton_kho.4_trang",
      rpc: "phan_tich_ton_kho",
      roles: manager,
      // features/analytics/api/analytics.api.ts — fetchAnalysisRows (đo tổng cả vòng)
      params: { p_so_ngay: paceDays, via: "fetchAllPages" },
      run: async (c) => {
        const rows = await fetchAllPages(async (from, to) => {
          const { data, error } = await c
            .rpc("phan_tich_ton_kho", { p_so_ngay: paceDays })
            .range(from, to);
          if (error) throw error;
          return data ?? [];
        });
        return rows.length;
      },
    },
    {
      id: "hoat_dong_gan_day",
      rpc: "hoat_dong_gan_day",
      roles: manager,
      // dashboard.api.ts fetchActivity: ACTIVITY_PAGE_SIZE = 20, nhóm "all" → p_nhom bỏ trống
      params: { p_gioi_han: 20 },
      run: async (c) => rowsOf(await c.rpc("hoat_dong_gan_day", { p_gioi_han: 20 })),
    },
    {
      id: "bang_dem_kiem_ke",
      rpc: "bang_dem_kiem_ke",
      roles: both,
      params: { p_chung_tu_id: sessionId },
      skipReason: skip("BENCH-KK-MO", sessionId !== undefined),
      // stocktake.api.ts:59 — không có nhóm thì bỏ hẳn p_nhom_hang_id
      run: async (c) =>
        rowsOf(await c.rpc("bang_dem_kiem_ke", { p_chung_tu_id: sessionId ?? "" })),
    },
    {
      id: "tim_kiem_toan_cuc.so_ct",
      rpc: "tim_kiem_toan_cuc",
      roles: both,
      // features/global-search/api/global-search.api.ts:7 — p_gioi_han 5
      params: { p_tu_khoa: soCtFrag, p_gioi_han: 5 },
      run: async (c) =>
        rowsOf(await c.rpc("tim_kiem_toan_cuc", { p_tu_khoa: soCtFrag, p_gioi_han: 5 })),
    },
    {
      id: "tim_kiem_toan_cuc.so_dh",
      rpc: "tim_kiem_toan_cuc",
      roles: both,
      params: { p_tu_khoa: soDhFrag, p_gioi_han: 5 },
      run: async (c) =>
        rowsOf(await c.rpc("tim_kiem_toan_cuc", { p_tu_khoa: soDhFrag, p_gioi_han: 5 })),
    },
    {
      id: "phan_tich_theo_ky.mac_dinh",
      rpc: "phan_tich_theo_ky",
      roles: manager,
      // period.api.ts fetchPeriodRows; khoảng = periodRange(defaultPeriodFilter(today))
      params: { p_tu: range.from, p_den: range.to },
      run: async (c) =>
        rowsOf(await c.rpc("phan_tich_theo_ky", { p_tu: range.from, p_den: range.to })),
    },
    {
      id: "phan_tich_theo_ky.90_ngay",
      rpc: "phan_tich_theo_ky",
      roles: manager,
      params: { p_tu: addDays(today, -89), p_den: today },
      run: async (c) =>
        rowsOf(
          await c.rpc("phan_tich_theo_ky", { p_tu: addDays(today, -89), p_den: today }),
        ),
    },
    {
      id: "nhap_xuat_theo_ky.mac_dinh",
      rpc: "nhap_xuat_theo_ky",
      roles: manager,
      // period.api.ts fetchFlowSeries, không lọc kho / mã
      params: { p_tu: range.from, p_den: range.to, p_buoc: step },
      run: async (c) =>
        rowsOf(
          await c.rpc("nhap_xuat_theo_ky", {
            p_tu: range.from,
            p_den: range.to,
            p_buoc: step,
          }),
        ),
    },
    ...[30, 90].map(
      (days): BenchCase => ({
        id: `nhap_xuat_theo_ngay.${days}`,
        rpc: "nhap_xuat_theo_ngay",
        roles: manager,
        // dashboard.api.ts fetchFlowByDay
        params: { p_so_ngay: days },
        run: async (c) => rowsOf(await c.rpc("nhap_xuat_theo_ngay", { p_so_ngay: days })),
      }),
    ),
    {
      id: "bao_cao_xuat_am",
      rpc: "bao_cao_xuat_am",
      roles: manager,
      // dashboard.api.ts fetchNegativeStockReport(null) → p_ngay bỏ trống
      params: {},
      run: async (c) => rowsOf(await c.rpc("bao_cao_xuat_am", {})),
    },
    {
      id: "danh_sach_doi_tac.o_chon_khach",
      rpc: "danh_sach_doi_tac",
      roles: both,
      // shared/api/customer-lookup.api.ts:13 — ô trống
      params: { p_loai: "KHACH", p_dang_hoat_dong: true, p_trang: 1, p_kich_thuoc: 20 },
      run: async (c) =>
        rowsOf(
          await c.rpc("danh_sach_doi_tac", {
            p_loai: "KHACH",
            p_dang_hoat_dong: true,
            p_trang: 1,
            p_kich_thuoc: 20,
          }),
        ),
    },
    {
      id: "danh_sach_doi_tac.trang_doi_tac",
      rpc: "danh_sach_doi_tac",
      roles: manager,
      // features/partners/api/partner.api.ts:23 — bộ lọc mặc định (đang hoạt động), trang 1
      params: { p_dang_hoat_dong: true, p_trang: 1, p_kich_thuoc: 50 },
      run: async (c) =>
        rowsOf(
          await c.rpc("danh_sach_doi_tac", {
            p_dang_hoat_dong: true,
            p_trang: 1,
            p_kich_thuoc: 50,
          }),
        ),
    },
    {
      id: "danh_sach_don.mac_dinh",
      rpc: "danh_sach_don",
      roles: both,
      // toOrderListRpcArgs(readOrderFilterFromUrl(rỗng)) — hàm thật của frontend
      params: orderArgs,
      run: async (c) => rowsOf(await c.rpc("danh_sach_don", orderArgs)),
    },
    {
      id: "dem_don_theo_trang_thai.mac_dinh",
      rpc: "dem_don_theo_trang_thai",
      roles: both,
      params: orderCountArgs,
      run: async (c) => rowsOf(await c.rpc("dem_don_theo_trang_thai", orderCountArgs)),
    },
    {
      id: "danh_sach_chung_tu.hoa_don",
      rpc: "danh_sach_chung_tu",
      roles: both,
      // toIssueListRpcArgs(readIssueFilterFromUrl(rỗng)) — hàm thật của frontend
      params: issueArgs,
      run: async (c) => rowsOf(await c.rpc("danh_sach_chung_tu", issueArgs)),
    },
    {
      id: "the_kho_san_pham",
      rpc: "the_kho_san_pham",
      roles: both,
      // features/products/api/product.api.ts:63 — trang 1, mọi kho
      params: { p_san_pham_id: hotProductId, p_trang: 1, p_kich_thuoc: 50 },
      skipReason: skip("BENCH-0001", hotProductId !== undefined),
      run: async (c) =>
        rowsOf(
          await c.rpc("the_kho_san_pham", {
            p_san_pham_id: hotProductId ?? "",
            p_trang: 1,
            p_kich_thuoc: 50,
          }),
        ),
    },
    {
      id: "lich_su_giao_dich_doi_tac",
      rpc: "lich_su_giao_dich_doi_tac",
      roles: manager,
      // features/partners/api/partner.api.ts:99
      params: { p_doi_tac_id: partnerId, p_trang: 1, p_kich_thuoc: 50 },
      skipReason: skip("NBBENCH", partnerId !== undefined),
      run: async (c) =>
        rowsOf(
          await c.rpc("lich_su_giao_dich_doi_tac", {
            p_doi_tac_id: partnerId ?? "",
            p_trang: 1,
            p_kich_thuoc: 50,
          }),
        ),
    },
    ...[
      { id: "tim_san_pham.1_ky_tu", keyword: "6" },
      { id: "tim_san_pham.5_ky_tu", keyword: "nhong" },
    ].map(
      ({ id, keyword }): BenchCase => ({
        id,
        rpc: "tim_san_pham",
        roles: both,
        // shared/api/product-search.api.ts:17 — p_gioi_han 20
        params: { p_tu_khoa: keyword, p_gioi_han: 20 },
        run: async (c) =>
          rowsOf(await c.rpc("tim_san_pham", { p_tu_khoa: keyword, p_gioi_han: 20 })),
      }),
    ),
    deleteLine,
  ];

  return { cases, missing };
}
