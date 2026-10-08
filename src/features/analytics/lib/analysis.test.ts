import { describe, expect, it } from "vitest";
import {
  toAnalysisRow,
  type AnalysisRow,
  type AnalysisSettings,
} from "@/features/analytics/types";
import {
  buildReorderCsv,
  finishOf,
  reorderTabs,
  stockStatus,
  suggestedOrder,
} from "@/features/analytics/lib/analysis";

const ANALYSIS_SETTINGS: AnalysisSettings = {
  redDays: 7,
  yellowDays: 14,
  coverDays: 30,
};
function arow(over: Partial<AnalysisRow>): AnalysisRow {
  return {
    productId: "p",
    code: "A",
    name: "Hàng A",
    categoryId: "g1",
    categoryName: "Nhóm 1",
    finish: "SON",
    unitName: "Cái",
    stock: 10,
    customerOrdered: 0,
    available: 10,
    soldInPeriod: 0,
    soldFirstHalf: 0,
    soldSecondHalf: 0,
    effectiveDays: 30,
    avgDailySales: null,
    daysOfCover: null,
    stockoutDate: null,
    minStock: 0,
    lastSaleDate: null,
    ...over,
  };
}

describe("analysis (phân tích tồn kho)", () => {
  it("đề nghị nhập, trạng thái theo định mức, gom tab (Phase 13, PTICH-01..05)", () => {
    // Mapper: numeric PostgREST về dạng chuỗi/số, null giữ null; mã công đoạn lạ -> Khác.
    const mapped = toAnalysisRow({
      san_pham_id: "p1",
      ma_hang: "RWT",
      ten_hang: "Hàng RWT",
      nhom_hang_id: null as unknown as string,
      ten_nhom_hang: null as unknown as string,
      cong_doan_ma: "MUA_NGOAI",
      ten_dvt: "Cái",
      ton: 1,
      khach_dat: 0,
      ton_kha_dung: 1,
      ban_trong_ky: 59,
      ban_nua_dau: 20,
      ban_nua_sau: 39,
      so_ngay_thuc: 27,
      ban_tb_ngay: 2.1852,
      so_ngay_con: 0.46,
      ngay_het_du_kien: "2026-10-02",
      ton_toi_thieu: 0,
      ngay_ban_cuoi: "2026-09-29",
    });
    expect(mapped.finish, "MUA_NGOAI gộp vào Khác").toBe("KHAC");
    expect(mapped.avgDailySales).toBe(2.1852);
    expect(mapped.categoryName).toBe(null);

    // Ví dụ kiểm chứng trong spec Notion: tồn 1, bán 59 trong 27 ngày -> ⌈2,19 × 30 − 1⌉ = 65.
    expect(
      suggestedOrder(arow({ available: 1, avgDailySales: 59 / 27 }), 30),
      "đề nghị nhập ví dụ RWT = 65",
    ).toBe(65);
    expect(
      suggestedOrder(arow({ available: 500, avgDailySales: 1 }), 30),
      "đủ hàng: đề nghị 0, không âm",
    ).toBe(0);
    expect(
      suggestedOrder(arow({ available: 0, avgDailySales: null }), 30),
      "không xuất, không định mức: không đề nghị",
    ).toBe(0);
    expect(
      suggestedOrder(
        arow({ available: 2, avgDailySales: null, minStock: 10 }),
        30,
      ),
      "không xuất: bù đủ định mức",
    ).toBe(8);
    expect(
      suggestedOrder(
        arow({ available: 5, avgDailySales: 0.1, minStock: 20 }),
        30,
      ),
      "định mức lớn hơn nhu cầu 30 ngày",
    ).toBe(15);

    // Trạng thái theo định mức (stock 10, minStock 0 mặc định).
    const st = (o: Partial<AnalysisRow>) =>
      stockStatus(arow(o), ANALYSIS_SETTINGS);
    expect(
      st({ stock: 5, available: 5, minStock: 8, avgDailySales: null }),
      "tồn < định mức: Dưới định mức",
    ).toBe("urgent");
    expect(
      st({ stock: 0, available: 0, avgDailySales: 2 }),
      "hết hàng, chưa đặt định mức: Sắp thiếu hàng",
    ).toBe("soon");
    expect(
      st({ stock: 10, available: 10, minStock: 5, avgDailySales: 1 }),
      "trên định mức, thiếu cho 30 ngày: Sắp thiếu hàng",
    ).toBe("soon");
    expect(
      st({ stock: 100, available: 100, minStock: 5, avgDailySales: 1 }),
      "trên định mức, đủ 30 ngày: Trên định mức",
    ).toBe("ok");
    expect(
      st({ stock: 5, avgDailySales: null }),
      "không xuất, không dưới định mức",
    ).toBe("no-sales");
    expect(
      st({ stock: 0, avgDailySales: null, customerOrdered: 3, available: -3 }),
      "hết hàng có đơn đặt: Sắp thiếu hàng",
    ).toBe("soon");

    expect(finishOf("XI_MA")).toBe("XI_MA");
    expect(finishOf(null)).toBe("KHAC");

    const rows = [
      arow({
        code: "M1",
        stock: 3,
        available: 3,
        minStock: 10,
        avgDailySales: 1,
        daysOfCover: 3,
        soldInPeriod: 30,
      }),
      arow({
        code: "S1",
        stock: 5,
        available: 5,
        avgDailySales: 1,
        daysOfCover: 5,
        soldInPeriod: 30,
      }),
      arow({
        code: "S2",
        stock: 10,
        available: 10,
        avgDailySales: 1,
        daysOfCover: 10,
        soldInPeriod: 30,
      }),
      arow({
        code: "O1",
        stock: 0,
        available: 0,
        avgDailySales: 2,
        daysOfCover: 0,
        soldInPeriod: 60,
      }),
      arow({ code: "N1", stock: 40, avgDailySales: null, soldInPeriod: 0 }),
      arow({
        code: "B1",
        stock: 400,
        available: 400,
        avgDailySales: 1,
        daysOfCover: 400,
        soldInPeriod: 30,
      }),
    ];

    const tabs = reorderTabs(rows, ANALYSIS_SETTINGS);
    expect(
      tabs.urgent.map((r) => r.code),
      "Dưới định mức",
    ).toStrictEqual(["M1"]);
    expect(
      tabs.soon.map((r) => r.code),
      "Sắp thiếu hàng, ít ngày nhất lên đầu",
    ).toStrictEqual(["O1", "S1", "S2"]);
    expect(tabs.outWithDemand.map((r) => r.code)).toStrictEqual(["O1"]);
  });

  it("CSV danh sách cần nhập đúng 3 cột", async () => {
    const csv = await buildReorderCsv(
      [
        arow({
          code: "RWT",
          name: "Hàng RWT",
          available: 1,
          stock: 1,
          avgDailySales: 59 / 27,
          daysOfCover: 0.46,
        }),
      ],
      ANALYSIS_SETTINGS,
    ).text();
    const header = csv.split("\r\n")[0] ?? "";
    // Excel danh sách cần nhập: đúng 3 cột theo yêu cầu.
    expect(header.replace(/^﻿/, "")).toBe("Mã hàng,Tên hàng,Số lượng cần nhập");
    expect(csv.includes("RWT,Hàng RWT,65"), "dòng RWT đề nghị 65").toBeTruthy();
  });
});
