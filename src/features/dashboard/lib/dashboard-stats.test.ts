import { describe, expect, it } from "vitest";
import { countNegativeByReason } from "@/features/dashboard/lib/dashboard-stats";

describe("dashboard-stats", () => {
  it("đếm xuất âm theo lý do (Phase 7, 07-04)", () => {
    const empty = countNegativeByReason([]);
    expect(
      empty.length,
      "luôn trả đủ 4 lý do cố định kể cả không có dòng nào",
    ).toBe(4);
    expect(
      empty.map((r) => r.code),
      "đúng thứ tự NEGATIVE_REASONS",
    ).toStrictEqual([
      "MA_BI_TACH",
      "HANG_VE_CHUA_NHAP",
      "LECH_TON_CHO_KIEM_KE",
      "KHAC",
    ]);
    expect(
      empty.every((r) => r.count === 0),
      "mảng rỗng thì mọi lý do cố định đếm 0",
    ).toBeTruthy();

    const withLines = countNegativeByReason([
      { reasonCode: "KHAC" },
      { reasonCode: "KHAC" },
      { reasonCode: "MA_BI_TACH" },
      { reasonCode: "ZQX_LA" },
      { reasonCode: null },
    ]);
    const byCode = new Map(withLines.map((r) => [r.code, r]));
    expect(byCode.get("KHAC")?.count).toBe(2);
    expect(byCode.get("MA_BI_TACH")?.count).toBe(1);
    expect(byCode.get("HANG_VE_CHUA_NHAP")?.count).toBe(0);
    expect(byCode.get("LECH_TON_CHO_KIEM_KE")?.count).toBe(0);
    expect(
      byCode.get("ZQX_LA")?.count,
      "mã lạ vẫn được đếm, nhãn giữ nguyên văn",
    ).toBe(1);
    expect(byCode.get("ZQX_LA")?.label).toBe("ZQX_LA");
    expect(byCode.get(null)?.count).toBe(1);
    expect(byCode.get(null)?.label).toBe("Chưa ghi lý do");
    expect(
      withLines.reduce((sum, r) => sum + r.count, 0),
      "tổng count bằng đúng số dòng đầu vào",
    ).toBe(5);
  });
});
