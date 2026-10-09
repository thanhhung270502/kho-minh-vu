import { describe, expect, it } from "vitest";
import {
  sessionStatus,
  SESSION_STATUS_LABELS,
} from "@/features/stocktake/lib/session-status";

describe("session-status", () => {
  it("nhãn trạng thái phiên kiểm kê (06-09)", () => {
    expect(
      sessionStatus({ state: "HOAN_THANH", counted: 3, scope: 5, recount: 0 }),
    ).toBe("approved");
    expect(
      sessionStatus({ state: "DA_HUY", counted: 0, scope: 5, recount: 0 }),
    ).toBe("voided");
    expect(
      sessionStatus({ state: "NHAP_LIEU", counted: 0, scope: 5, recount: 0 }),
    ).toBe("new");
    expect(
      sessionStatus({ state: "NHAP_LIEU", counted: 2, scope: 5, recount: 0 }),
    ).toBe("counting");
    expect(
      sessionStatus({ state: "NHAP_LIEU", counted: 5, scope: 5, recount: 0 }),
    ).toBe("ready");
    expect(
      sessionStatus({ state: "NHAP_LIEU", counted: 5, scope: 5, recount: 1 }),
    ).toBe("counting");
    expect(SESSION_STATUS_LABELS).toStrictEqual({
      new: "Mới mở",
      counting: "Đang đếm",
      ready: "Chờ duyệt",
      approved: "Đã duyệt",
      voided: "Đã hủy",
    });
  });
});
