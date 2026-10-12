import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";

import { readFirstSheet } from "@/shared/lib/excel-cell";

async function workbook(build: (wb: ExcelJS.Workbook) => void): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  build(wb);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

describe("readFirstSheet", () => {
  it("không có requiredHeader: sheet đầu, dòng 1 là tiêu đề", async () => {
    const buf = await workbook((wb) => {
      const ws = wb.addWorksheet("A");
      ws.addRow(["Mã hàng", "Tồn kho"]);
      ws.addRow(["MH1", 5]);
    });

    const sheet = await readFirstSheet(buf);

    expect(sheet.headers).toStrictEqual(["ma_hang", "ton_kho"]);
    expect(sheet.rows).toHaveLength(1);
    expect(sheet.rows[0].rowNumber).toBe(2);
  });

  it("requiredHeader: bỏ qua dòng tiêu đề phụ phía trên và giữ số dòng thật", async () => {
    const buf = await workbook((wb) => {
      const ws = wb.addWorksheet("A");
      ws.addRow(["Danh mục hàng hóa ngày 11/10"]);
      ws.addRow([]);
      ws.addRow(["Mã hàng", "Tên hàng", "Tồn kho"]);
      ws.addRow(["MH1", "Hàng 1", 5]);
    });

    const sheet = await readFirstSheet(buf, { requiredHeader: "ma_hang" });

    expect(sheet.headers).toStrictEqual(["ma_hang", "ten_hang", "ton_kho"]);
    expect(sheet.rows.map((r) => r.rowNumber)).toStrictEqual([4]);
    expect(sheet.rows[0].cells.ma_hang).toBe("MH1");
  });

  it("requiredHeader: lấy sheet có cột đó dù sheet hướng dẫn đứng trước", async () => {
    const buf = await workbook((wb) => {
      wb.addWorksheet("Hướng dẫn").addRow(["Cột", "Cách điền"]);
      const ws = wb.addWorksheet("Danh mục");
      ws.addRow(["Mã hàng", "Tên hàng"]);
      ws.addRow(["MH2", "Hàng 2"]);
    });

    const sheet = await readFirstSheet(buf, { requiredHeader: "ma_hang" });

    expect(sheet.rows.map((r) => r.cells.ma_hang)).toStrictEqual(["MH2"]);
  });

  it("requiredHeader vắng: trả dòng 1 của sheet đầu để nơi gọi báo các cột đã đọc", async () => {
    const buf = await workbook((wb) => {
      const ws = wb.addWorksheet("A");
      ws.addRow(["Code", "Name"]);
      ws.addRow(["X", "Y"]);
    });

    const sheet = await readFirstSheet(buf, { requiredHeader: "ma_hang" });

    expect(sheet.rawHeaders.filter(Boolean)).toStrictEqual(["Code", "Name"]);
  });
});
