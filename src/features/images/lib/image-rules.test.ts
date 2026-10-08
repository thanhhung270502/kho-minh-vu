import { describe, expect, it } from "vitest";
import {
  scaleToFit,
  checkPickedFile,
  safeFileStem,
  isWebp,
  detectImageFormat,
} from "@/features/images/lib/image-rules";

describe("image-rules", () => {
  it("quy tắc nén ảnh, kiểm file chọn, nhận dạng định dạng (09-03)", () => {
    expect(
      scaleToFit(4000, 3000, 1200),
      "thu vừa cạnh dài, giữ tỉ lệ",
    ).toStrictEqual({ width: 1200, height: 900 });
    expect(
      scaleToFit(800, 600, 1200),
      "ảnh nhỏ hơn giới hạn thì không phóng to",
    ).toStrictEqual({ width: 800, height: 600 });
    expect(
      scaleToFit(3000, 4000, 300),
      "ảnh dọc thu theo cạnh dài nhất",
    ).toStrictEqual({ width: 225, height: 300 });
    const canhCuc = scaleToFit(1, 5000, 300);
    expect(canhCuc.width >= 1, "chiều rộng không bao giờ ra 0").toBeTruthy();

    expect(
      checkPickedFile({ name: "a.heic", type: "image/heic", size: 1000 }) ===
        null,
      "HEIC không bị chặn trước — Safari đọc được, trình duyệt khác báo lúc đọc",
    ).toBeTruthy();
    expect(
      checkPickedFile({ name: "IMG_1.HEIC", type: "", size: 1000 }) === null,
      "HEIC theo đuôi khi type rỗng cũng cho qua",
    ).toBeTruthy();
    expect(
      checkPickedFile({ name: "a.gif", type: "image/gif", size: 1000 }),
      "GIF được nhận",
    ).toBe(null);
    expect(
      checkPickedFile({ name: "a.bmp", type: "image/bmp", size: 1000 }),
      "BMP được nhận",
    ).toBe(null);
    expect(
      checkPickedFile({ name: "a.avif", type: "image/avif", size: 1000 }),
      "AVIF được nhận",
    ).toBe(null);
    expect(
      checkPickedFile({ name: "zalo.JPG", type: "", size: 1000 }),
      "type rỗng nhận theo đuôi",
    ).toBe(null);
    expect(
      checkPickedFile({
        name: "bao-gia.pdf",
        type: "application/pdf",
        size: 1000,
      }),
      "không phải ảnh thì bị chặn",
    ).not.toBe(null);
    expect(
      checkPickedFile({ name: "khong-duoi", type: "", size: 1000 }),
      "không type, không đuôi thì bị chặn",
    ).not.toBe(null);
    expect(
      checkPickedFile({ name: "a.jpg", type: "image/jpeg", size: 0 }),
      "file rỗng bị chặn",
    ).not.toBe(null);
    expect(
      checkPickedFile({
        name: "a.jpg",
        type: "image/jpeg",
        size: 31 * 1024 * 1024,
      }),
      "file quá 30 MB bị chặn",
    ).not.toBe(null);
    expect(
      checkPickedFile({ name: "a.jpg", type: "image/jpeg", size: 2_000_000 }),
      "file hợp lệ qua được",
    ).toBe(null);

    expect(
      safeFileStem("PT/XE 01"),
      "ký tự không hợp lệ thay bằng gạch dưới",
    ).toBe("PT_XE_01");
    expect(
      safeFileStem("///"),
      "toàn ký tự không hợp lệ thì trả về mặc định",
    ).toBe("ma-hang");
    expect(safeFileStem("Á-1"), "bỏ dấu tiếng Việt").toBe("A-1");
    expect(
      safeFileStem("A".repeat(200)).length <= 80,
      "cắt tối đa 80 ký tự",
    ).toBeTruthy();

    expect(
      isWebp(new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80])),
      "nhận đúng magic byte RIFF/WEBP",
    ).toBe(true);
    expect(
      isWebp(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
      "không phải WebP thì trả false",
    ).toBe(false);
    expect(
      detectImageFormat(
        new Uint8Array([82, 73, 70, 70, 0, 0, 0, 0, 87, 69, 66, 80]),
      ),
      "WebP từ Chrome/Android",
    ).toStrictEqual({ mimeType: "image/webp", extension: "webp" });
    expect(
      detectImageFormat(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
      "JPEG dự phòng từ iPhone",
    ).toStrictEqual({ mimeType: "image/jpeg", extension: "jpg" });
    expect(
      detectImageFormat(new Uint8Array([0x89, 0x50, 0x4e, 0x47])),
      "PNG thô không nhận",
    ).toBe(null);
  });
});
