import { describe, expect, it } from "vitest";
import { orderProgress } from "@/features/sales-order/lib/order-progress";

describe("order-progress", () => {
  it("tiến độ xuất của đơn", () => {
    expect(orderProgress(0, 0)).toStrictEqual({ percent: null, label: "—" });
    expect(orderProgress(3, 7)).toStrictEqual({ percent: 43, label: "3/7" });
    expect(orderProgress(400, 400)).toStrictEqual({
      percent: 100,
      label: "400/400",
    });
    expect(orderProgress(1500, 2000)).toStrictEqual({
      percent: 75,
      label: "1.500/2.000",
    });
    expect(orderProgress(9, 7).percent).toBe(100);
  });
});
