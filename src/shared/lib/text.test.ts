import { describe, expect, it } from "vitest";
import {
  removeDiacritics,
  normalizeUsername,
  usernameToEmail,
  labelMatches,
} from "@/shared/lib/text";

describe("text", () => {
  it("bỏ dấu, chuẩn hóa tên đăng nhập và email", () => {
    expect(removeDiacritics("Đặng Thị Ngọc")).toBe("Dang Thi Ngoc");
    expect(normalizeUsername("  Kim.Chi ")).toBe("kim.chi");
    expect(normalizeUsername("Ngọc Ánh")).toBe("ngocanh");
    expect(usernameToEmail("thukho1")).toBe("thukho1@khominhvu.local");
    expect(usernameToEmail("thukho1@khominhvu.local")).toBe(
      "thukho1@khominhvu.local",
    );
  });

  it("ô chọn tìm không dấu (labelMatches)", () => {
    {
      expect(
        labelMatches("lien", "NCC000023 — CÔNG TY TNHH LIÊN HOA"),
        "gõ không dấu, chữ thường vẫn khớp nhãn có dấu",
      ).toBeTruthy();
      expect(
        labelMatches("cong ty", "CÔNG TY TNHH TÂM PHONG"),
        "khớp nhiều từ",
      ).toBeTruthy();
      expect(
        labelMatches("dung", "CÔNG TY TNHH TMDV DŨNG PHONG"),
        "đ/Đ và dấu ngã đều bỏ",
      ).toBeTruthy();
      expect(
        labelMatches("  kho 1 ", "Kho 1"),
        "bỏ khoảng trắng hai đầu",
      ).toBeTruthy();
      expect(
        !labelMatches("xyz", "Kho 1"),
        "không khớp thì trả false",
      ).toBeTruthy();
    }
  });
});
