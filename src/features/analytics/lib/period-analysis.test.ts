import { describe, expect, it } from "vitest";
import { readPeriodFilter } from "@/features/analytics/lib/period";
import {
  matchesPeriodFilter,
  periodKpis,
  breakdown,
  changeRatio,
  hasActivity,
  salesMovers,
  slowStock,
  topCategories,
  topProducts,
} from "@/features/analytics/lib/period-analysis";

describe("period-analysis", () => {
  it("lọc hãng / dòng, KPI, cơ cấu và bảng xếp hạng theo kỳ (0099)", () => {
    // Lọc hãng / dòng tính cả xe dùng chung.
    const base = {
      productId: "p",
      code: "A",
      name: "A",
      categoryId: "c1",
      categoryName: "N",
      isCombo: false,
      isActive: true,
      unitName: "Cái",
      brandCode: "H",
      modelCode: "V",
      sharedVehicles: [{ brandCode: "Y", modelCode: "AC" }],
      partCode: "12",
      stageId: "s1",
      stageName: "Xi",
      openingStock: 10,
      received: 5,
      sold: 8,
      internalOut: 0,
      returned: 0,
      adjusted: 0,
      closingStock: 7,
      receivedPrev: 0,
      soldPrev: 4,
    };
    const none = readPeriodFilter(new URLSearchParams(""), "2026-10-05");
    expect(
      matchesPeriodFilter(base, { ...none, brandCode: "Y", modelCode: "AC" }),
      "khớp xe dùng chung",
    ).toBe(true);
    expect(
      matchesPeriodFilter(base, { ...none, brandCode: "H", modelCode: "AC" }),
      "dòng phải cùng hãng",
    ).toBe(false);
    expect(matchesPeriodFilter(base, { ...none, partCode: "13" })).toBe(false);

    const k = periodKpis(
      [
        base,
        {
          ...base,
          productId: "q",
          sold: 0,
          soldPrev: 0,
          openingStock: 0,
          closingStock: 3,
        },
      ],
      [
        {
          date: "2026-09-01",
          received: 5,
          sold: 8,
          internalOut: 0,
          receiptCount: 2,
          invoiceCount: 3,
        },
      ],
    );
    expect(k.sold).toBe(8);
    expect(k.invoiceCount).toBe(3);
    expect(k.sellingProducts).toBe(1);
    expect(k.turnover, "vòng quay = xuất bán ÷ tồn bình quân").toBe(
      8 / ((10 + 10) / 2),
    );
    expect(changeRatio(8, 4)).toBe(1);
    expect(changeRatio(5, 0), "kỳ trước 0: không chia").toBe(null);
    expect(
      hasActivity({
        ...base,
        openingStock: 0,
        received: 0,
        sold: 0,
        closingStock: 0,
        soldPrev: 0,
      }),
    ).toBe(false);

    // Cơ cấu theo hãng chỉ tính cặp chính (không đếm một lần bán hai lần).
    const namer = {
      brand: (b: string) => (b === "H" ? "HONDA" : b),
      model: (_b: string, m: string) => m,
      part: (p: string) => p,
    };
    expect(breakdown([base], "hang", namer)).toStrictEqual([
      { key: "H", label: "HONDA", sold: 8, soldPrev: 4 },
    ]);

    // Bảng xếp hạng theo kỳ.
    const r = (id: string, o: Partial<typeof base>) => ({
      ...base,
      productId: id,
      code: id,
      ...o,
    });
    const ranked = [
      r("B1", { sold: 50, soldPrev: 10, categoryId: "c1" }),
      r("B2", { sold: 30, soldPrev: 60, categoryId: "c2", categoryName: "M" }),
      r("B3", { sold: 0, soldPrev: 0, closingStock: 90 }),
      r("B4", { sold: 1, soldPrev: 1, closingStock: 400 }),
    ];
    expect(topProducts(ranked, 2).map((x) => x.code)).toStrictEqual([
      "B1",
      "B2",
    ]);
    const cats = topCategories(ranked, 5);
    expect(cats[0]?.sold, "nhóm c1 = B1 + B4").toBe(51);
    expect(cats[0]?.share, "tỉ trọng trong tổng xuất bán").toBe(51 / 81);
    const mv = salesMovers(ranked, 5);
    expect(mv.up.map((x) => x.code)).toStrictEqual(["B1"]);
    expect(mv.down.map((x) => x.code)).toStrictEqual(["B2"]);
    expect(mv.upCount, "đếm đủ, không bị cắt top").toBe(1);
    const slow = slowStock(ranked, 30, 10);
    expect(
      slow.noSales.map((x) => x.code),
      "còn tồn, kỳ này không bán",
    ).toStrictEqual(["B3"]);
    expect(
      slow.overstock.map((x) => x.row.code),
      "400 ÷ (1/30) = 12.000 ngày ≥ 365",
    ).toStrictEqual(["B4"]);
    expect(slow.noSalesQty, "tổng tồn của mã không bán").toBe(90);
  });
});
