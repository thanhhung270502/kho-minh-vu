import { describe, expect, it } from "vitest";
import {
  toFlowDay,
  toOverviewKpis,
  toStockByGroupRow,
} from "@/features/dashboard/types";
import {
  averageIssuesLabel,
  formatUpdatedAt,
  groupShare,
  negativeByWarehouseLabel,
  oldestPendingLabel,
  pendingBreakdownLabel,
  vsYesterdayLabel,
} from "@/features/dashboard/lib/overview-format";

describe("overview-format", () => {
  it("tổng quan 3b (Phase 20, UI3B-03/04)", () => {
    type OverviewDb = Parameters<typeof toOverviewKpis>[0];
    const overviewRow = (over: Partial<Record<string, unknown>> = {}) =>
      ({
        xem_gia_von: true,
        gia_tri_ton: 312500000,
        gia_tri_ton_thang_truoc: 305000000,
        tong_sl_ton: "9000",
        tong_sl_ton_thang_truoc: "8800",
        xu_huong_ton: ["1", 2],
        ma_kinh_doanh: 3000,
        ma_moi_thang: 3,
        xu_huong_ma_kd: [1, 2],
        phieu_xuat_tb_ngay: 4.2,
        cho_ghi_so: 5,
        cho_ghi_so_nhap: 3,
        cho_ghi_so_xuat: 2,
        cho_ghi_so_cu_nhat_ngay: 2,
        xu_huong_cho_ghi_so: [0, 5],
        ton_am_theo_kho: [{ ten_kho: "Kho 1", so_ma: 4 }],
        vi_du_duoi_dinh_muc: ["A", "B"],
        ...over,
      }) as unknown as OverviewDb;

    const k = toOverviewKpis(overviewRow());
    expect(k.pendingTrend, "xu_huong_cho_ghi_so ép về number[]").toStrictEqual([
      0, 5,
    ]);
    expect(k.negativeByWarehouse).toStrictEqual([
      { warehouseName: "Kho 1", count: 4 },
    ]);
    expect(k.oldestPendingDays).toBe(2);
    expect(
      toOverviewKpis(overviewRow({ ton_am_theo_kho: { x: 1 } }))
        .negativeByWarehouse,
      "jsonb không phải mảng → []",
    ).toStrictEqual([]);

    expect(
      toStockByGroupRow({
        nhom_id: null,
        ten_nhom: null,
        tong_ma: 1,
        con_hang: 1,
        het_hang: 0,
        am: 0,
        duoi_dinh_muc: 0,
        tong_so_luong: "120.5",
      } as unknown as Parameters<typeof toStockByGroupRow>[0]).totalQuantity,
    ).toBe(120.5);
    expect(
      toFlowDay({
        ngay: "2092-03-09",
        so_phieu_nhap: 2,
        so_phieu_xuat: 0,
        sl_nhap: "10",
        sl_xuat: "0",
      } as unknown as Parameters<typeof toFlowDay>[0]),
    ).toStrictEqual({
      date: "2092-03-09",
      receiptCount: 2,
      issueCount: 0,
      receiptQuantity: 10,
      issueQuantity: 0,
    });
    expect(vsYesterdayLabel(12, 9)).toBe("Hôm qua 9 · ▲ +3");
    expect(vsYesterdayLabel(5, 0), "hôm qua 0 không chia").toBe(
      "Hôm qua 0 · ▲ +5",
    );
    expect(vsYesterdayLabel(7, 10)).toBe("Hôm qua 10 · ▼ −3");
    expect(vsYesterdayLabel(4, 4)).toBe("Bằng hôm qua (4)");
    expect(averageIssuesLabel(4.2)).toBe("TB 4,2 phiếu/ngày");
    expect(oldestPendingLabel(null)).toBe("Không có phiếu chờ");
    expect(oldestPendingLabel(0)).toBe("Cũ nhất hôm nay");
    expect(oldestPendingLabel(2)).toBe("Cũ nhất 2 ngày");
    expect(pendingBreakdownLabel(5, 3, 2)).toBe("3 phiếu nhập · 2 phiếu xuất");
    expect(pendingBreakdownLabel(6, 3, 2)).toBe(
      "3 phiếu nhập · 2 phiếu xuất · 1 phiếu trả",
    );
    expect(
      negativeByWarehouseLabel([
        { warehouseName: "Kho 1", count: 4 },
        { warehouseName: "Kho 2", count: 2 },
      ]),
    ).toBe("Kho 1: 4 mã · Kho 2: 2 mã");
    expect(negativeByWarehouseLabel([])).toBe("Không có");
    const share = groupShare([
      { key: "a", totalQuantity: 75 },
      { key: "b", totalQuantity: 25 },
    ]);
    expect(share.get("a")).toBe(75);
    expect(share.get("b")).toBe(25);
    expect(
      groupShare([{ key: "a", totalQuantity: 0 }]).get("a"),
      "tổng 0 → 0%",
    ).toBe(0);
    expect(formatUpdatedAt(Date.UTC(2026, 8, 19, 1, 42))).toBe(
      "Cập nhật 08:42 · 19/09/2026",
    );
  });
});
