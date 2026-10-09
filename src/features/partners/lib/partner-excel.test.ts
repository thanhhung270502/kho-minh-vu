import { describe, expect, it } from "vitest";
import {
  mapPartnerHeaders,
  parseActiveFlag,
  parsePartnerKind,
} from "@/features/partners/lib/partner-excel";

describe("partner-excel", () => {
  it("nhập đối tác từ Excel (0109)", () => {
    expect(parsePartnerKind("Đối tác")).toStrictEqual({
      kind: "DOI_TAC",
      dbKind: null,
    });
    expect(parsePartnerKind("noi bo")).toStrictEqual({
      kind: "NOI_BO",
      dbKind: null,
    });
    // Chữ cũ của KiotViet: giữ loại database, loại hiển thị suy theo mã.
    expect(parsePartnerKind("Nhà cung cấp")).toStrictEqual({
      kind: null,
      dbKind: "NCC",
    });
    expect(parsePartnerKind("khách hàng")).toStrictEqual({
      kind: null,
      dbKind: "KHACH",
    });
    expect(parsePartnerKind("Cả hai")).toStrictEqual({
      kind: null,
      dbKind: "CA_HAI",
    });
    expect(parsePartnerKind("")).toBe(null);
    expect(parsePartnerKind("đại lý")).toBe("INVALID");
    expect(parseActiveFlag(1), "file KiotViet ghi 1 / 0").toBe(true);
    expect(parseActiveFlag(0)).toBe(false);
    expect(parseActiveFlag("Không")).toBe(false);
    expect(parseActiveFlag(null)).toBe(null);
    expect(parseActiveFlag("có lẽ")).toBe("INVALID");
    const h = mapPartnerHeaders([
      "ma_nha_cung_cap",
      "ten_nha_cung_cap",
      "loai",
      "dang_hoat_dong",
      "nguoi_tao",
    ]);
    expect(h.code).toBe("ma_nha_cung_cap");
    expect(h.name).toBe("ten_nha_cung_cap");
    expect(h.isActive).toBe("dang_hoat_dong");
  });
});
