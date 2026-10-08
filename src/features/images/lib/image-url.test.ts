import { describe, expect, it } from "vitest";
import { imageUrl } from "@/features/images/lib/image-url";

describe("image-url", () => {
  it("URL ảnh gốc và thumb", () => {
    expect(imageUrl("abc"), "URL ảnh gốc").toBe("/anh/abc");
    expect(
      imageUrl("abc", "thumb"),
      "URL ảnh thumb dùng tham số tiếng Việt không dấu",
    ).toBe("/anh/abc?co=nho");
  });
});
