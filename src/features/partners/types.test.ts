import { describe, expect, it } from "vitest";
import { docTypeLabel, toPartnerRow } from "@/features/partners/types";

describe("partners/types", () => {
  it("bảng đối tác 5 cột và nhãn loại chứng từ (Phase 14, PANEL-02/03)", () => {
    const row = toPartnerRow({
      id: "p1",
      ma: "NCC01",
      ten: "Vũ Trụ",
      loai: "NCC",
      dien_thoai: "",
      dia_chi: "",
      khu_vuc: "",
      email: "",
      ma_so_thue: "",
      ghi_chu: "",
      dang_hoat_dong: true,
      updated_at: "2026-10-02",
      tong_so_dong: 1,
      tong_giao_dich: "12" as unknown as number,
    });
    expect(
      row.transactionCount,
      "tong_giao_dich (bigint có thể về string) → số",
    ).toBe(12);
    expect(docTypeLabel("TRA_NCC")).toBe("Trả NCC");
    expect(docTypeLabel("TRA_KHACH")).toBe("Khách trả");
    expect(docTypeLabel("XUAT")).toBe("Hóa đơn");
    expect(docTypeLabel("LA"), "loại lạ hiện nguyên giá trị").toBe("LA");
  });
});
