import { describe, expect, it } from "vitest";

import { MAX_SESSION_PRODUCTS, openSessionSchema } from "./stocktake.schema";

const KHO = "00000000-0000-4000-8000-000000000001";
const ma = (i: number) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;

describe("openSessionSchema — phiên chọn theo mã (0129, 0131)", () => {
  it("phải chọn ít nhất một mã", () => {
    const r = openSessionSchema.safeParse({ warehouseId: KHO, scope: "products", categoryIds: [], productIds: [] });
    expect(r.success).toBe(false);
  });

  it("tối đa 2.000 mã, khớp chặn ở database", () => {
    const vua = Array.from({ length: MAX_SESSION_PRODUCTS }, (_, i) => ma(i + 1));
    const qua = [...vua, ma(MAX_SESSION_PRODUCTS + 1)];
    expect(openSessionSchema.safeParse({ warehouseId: KHO, scope: "products", categoryIds: [], productIds: vua }).success).toBe(true);
    expect(openSessionSchema.safeParse({ warehouseId: KHO, scope: "products", categoryIds: [], productIds: qua }).success).toBe(false);
  });
});
