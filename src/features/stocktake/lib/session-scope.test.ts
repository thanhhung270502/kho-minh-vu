import { describe, expect, it } from "vitest";

import { scopeLabel } from "./session-scope";

describe("scopeLabel", () => {
  it("phiên chọn theo mã hiện số mã (0129)", () => {
    expect(scopeLabel({ categoryNames: null, selectedProductCount: 12 })).toBe("12 mã chọn");
  });

  it("phiên theo nhóm hiện tên nhóm, không nhóm là toàn kho", () => {
    expect(scopeLabel({ categoryNames: "BAGA", selectedProductCount: null })).toBe("BAGA");
    expect(scopeLabel({ categoryNames: null, selectedProductCount: null })).toBe("Toàn kho");
  });
});
