import { describe, expect, it } from "vitest";
import {
  buildErrorCsv,
  errorFileName,
} from "@/features/products/lib/error-file";

describe("error-file", () => {
  it("CSV lỗi có BOM và nháy kép được nhân đôi", async () => {
    // CSV lỗi: Excel trên Windows cần BOM, và dấu nháy trong thông báo phải nhân đôi.
    const blob = buildErrorCsv([
      {
        row: 12,
        column: "dvt",
        message: 'Không có đơn vị tính "Thùng", kiểm tra',
      },
    ]);

    // Kiểm BYTE chứ không kiểm chuỗi: `blob.text()` giải mã UTF-8 theo chuẩn
    // WHATWG và chuẩn đó NUỐT BOM. Thứ Excel đọc là byte tải về, nên phải soi byte.
    const byte = new Uint8Array(await blob.arrayBuffer());
    expect(
      [...byte.slice(0, 3)],
      "CSV mở đầu bằng BOM UTF-8 để Excel đọc đúng tiếng Việt",
    ).toStrictEqual([0xef, 0xbb, 0xbf]);

    const csv = await blob.text();
    expect(
      csv.includes('"Không có đơn vị tính ""Thùng"", kiểm tra"'),
      "nháy kép trong thông báo được nhân đôi",
    ).toBeTruthy();
    expect(
      csv.includes("Đơn vị tính"),
      "tên cột hiển thị bằng tiêu đề tiếng Việt",
    ).toBeTruthy();
    expect(errorFileName("danh-muc-20260918-1030.xlsx")).toBe(
      "danh-muc-20260918-1030-loi.csv",
    );
  });
});
