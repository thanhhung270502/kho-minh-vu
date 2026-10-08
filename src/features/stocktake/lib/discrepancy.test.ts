import { describe, expect, it } from "vitest";
import {
  discrepancyOf,
  isLargeDiscrepancy,
} from "@/features/stocktake/lib/discrepancy";

describe("discrepancy", () => {
  it("ngưỡng lệch kiểm kê (06-09)", () => {
    expect(discrepancyOf(8, 10)).toBe(-2);
    expect(discrepancyOf(10, 10)).toBe(0);

    expect(isLargeDiscrepancy(10, 10), "lệch 0 thì không lớn").toBe(false);
    expect(isLargeDiscrepancy(15, 10), "|5| >= ngưỡng tuyệt đối").toBe(true);
    expect(isLargeDiscrepancy(11, 10), "lệch 10% tồn sổ").toBe(true);
    expect(isLargeDiscrepancy(104, 100), "lệch 4 và 4% đều dưới ngưỡng").toBe(
      false,
    );
    expect(
      isLargeDiscrepancy(2, 0),
      "tồn sổ 0 không tính theo tỉ lệ, lệch tuyệt đối dưới ngưỡng",
    ).toBe(false);
    expect(isLargeDiscrepancy(5, 0), "lệch tuyệt đối 5 đạt ngưỡng").toBe(true);
    expect(isLargeDiscrepancy(0, 3), "lệch -3 là 100% tồn sổ").toBe(true);
    expect(
      isLargeDiscrepancy(0, -4),
      "tồn sổ âm vẫn tính theo trị tuyệt đối (4/4 = 100%)",
    ).toBe(true);
  });
});
