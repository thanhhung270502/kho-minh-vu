import { describe, expect, it } from "vitest";
import {
  suggestCustomerName,
  extractPhoneNumber,
} from "@/features/partners/lib/notes";

describe("partners/notes", () => {
  it("tên khách đề xuất và SĐT từ ghi chú KiotViet", () => {
    expect(
      suggestCustomerName("TIẾN DŨNG 602 QUANG TRUNG\nSĐT 0909"),
      "tên đề xuất chỉ lấy dòng đầu, viết hoa chữ cái đầu",
    ).toBe("Tiến Dũng 602 Quang Trung");
    expect(
      extractPhoneNumber("HUY HOÀNG 5 \nPHƯỚC HẬU 0966116224"),
      "lấy được SĐT nằm ở dòng sau",
    ).toBe("0966116224");
    expect(extractPhoneNumber("NGỌC"), "ghi chú không có số thì trả null").toBe(
      null,
    );
  });
});
