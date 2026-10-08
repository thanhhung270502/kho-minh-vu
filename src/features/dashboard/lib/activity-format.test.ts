import { describe, expect, it } from "vitest";
import {
  activityHref,
  activityPhrase,
  activityTime,
} from "@/features/dashboard/lib/activity-format";

describe("activity-format", () => {
  it("hoạt động gần đây (0116)", () => {
    const base = {
      key: "k",
      at: "2026-10-07T07:00:00Z",
      targetId: "id-1",
      code: "DH1",
      detail: null,
      count: 1,
      viaImport: false,
      actor: "An",
    } as const;
    expect(
      activityPhrase({ ...base, kind: "DON_DAT", action: "xac_nhan" }),
    ).toStrictEqual({ verb: "xác nhận", object: "đơn" });
    expect(
      activityPhrase({
        ...base,
        kind: "NHAP",
        action: "ghi_so",
        count: 86,
        targetId: null,
        code: null,
      }),
    ).toStrictEqual({ verb: "ghi sổ", object: "86 phiếu nhập" });
    expect(
      activityPhrase({
        ...base,
        kind: "SAN_PHAM",
        action: "tao",
        count: 24,
        viaImport: true,
      }),
    ).toStrictEqual({ verb: "nhập Excel", object: "24 mã hàng" });
    expect(activityHref({ ...base, kind: "NHAP", action: "tao" })).toBe(
      "/nhap-hang/id-1",
    );
    expect(activityHref({ ...base, kind: "DOI_TAC", action: "sua" })).toBe(
      "/doi-tac?chon=id-1",
    );
    expect(
      activityHref({
        ...base,
        kind: "NHAP",
        action: "ghi_so",
        count: 5,
        targetId: null,
      }),
      "gộp nhiều phiếu → danh sách",
    ).toBe("/nhap-hang");
    expect(
      activityHref({ ...base, kind: "CHUYEN_KHO", action: "tao" }),
      "chưa có màn chuyển kho",
    ).toBe(null);
    const now = new Date(2026, 9, 7, 15, 0);
    expect(activityTime(new Date(2026, 9, 7, 14, 55).toISOString(), now)).toBe(
      "5 phút trước",
    );
    expect(activityTime(new Date(2026, 9, 6, 9, 5).toISOString(), now)).toBe(
      "Hôm qua 09:05",
    );
    expect(activityTime(new Date(2026, 9, 3, 8, 0).toISOString(), now)).toBe(
      "03/10 08:00",
    );
  });
});
