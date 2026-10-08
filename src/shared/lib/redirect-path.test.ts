import { describe, expect, it } from "vitest";
import { safeRedirectPath } from "@/shared/lib/redirect-path";

describe("safeRedirectPath", () => {
  it("chỉ nhận đường dẫn nội bộ, chặn chuyển hướng ra ngoài", () => {
    expect(safeRedirectPath("/danh-muc?nhom=a")).toBe("/danh-muc?nhom=a");
    for (const xau of [
      null,
      "",
      "danh-muc",
      "//evil.com",
      "/\\evil.com",
      "https://evil.com",
      "/x://y",
      "/dang-nhap",
    ]) {
      expect(safeRedirectPath(xau)).toBe("/");
    }
  });
});
