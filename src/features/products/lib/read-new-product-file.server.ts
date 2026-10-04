/**
 * Đọc / ghi file Excel "Nhập mã hàng mới" (4 cột). CHỈ CHẠY Ở SERVER (bẫy 7).
 *
 * KHÔNG `import "server-only"` — cùng lý do read-count-file.server.ts:
 * `scripts/test-excel-reader.ts` phải import được. Hàng rào thật là `node:stream`
 * bên trong `@/shared/lib/excel-cell`.
 */
import ExcelJS from "exceljs";

import { readFirstSheet, readNumber, readString } from "@/shared/lib/excel-cell";

import {
  NEW_PRODUCT_COLUMNS,
  REASON_COLUMN,
  type NewProductExportRow,
  type NewProductFileRow,
} from "./new-product-file";

export async function readNewProductFile(buf: Buffer): Promise<NewProductFileRow[]> {
  const sheet = await readFirstSheet(buf);

  // "Tên hàng" được để trống (cả cột): route tự điền từ sheet tên hàng chuẩn.
  if (!sheet.headers.includes("ma_hang")) {
    throw new Error("Dòng đầu của file phải có cột “Mã hàng”. Tải file mẫu 4 cột rồi điền vào đó.");
  }

  return sheet.rows.map((raw) => {
    const problems: string[] = [];
    const stockCell = raw.cells.ton_kho;
    const isBlank = stockCell === null || stockCell === undefined || readString(stockCell) === null;
    let stock = 0;
    if (!isBlank) {
      const parsed = readNumber(stockCell);
      if (parsed === null) problems.push("Tồn kho không phải là số");
      else if (parsed < 0) problems.push("Tồn kho không được âm");
      else stock = parsed;
    }

    return {
      row: raw.rowNumber,
      code: readString(raw.cells.ma_hang)?.trim() ?? "",
      name: readString(raw.cells.ten_hang)?.trim().replace(/\s+/g, " ") ?? "",
      nameFromSheet: false,
      stock,
      description: readString(raw.cells.mo_ta)?.trim() ?? "",
      problems,
    };
  });
}

/**
 * Không truyền dòng = file mẫu trống. Có dòng mang `reason` = file lỗi: thêm cột
 * "Lý do" ở CUỐI, bộ đọc bỏ qua cột lạ nên sửa xong nhập lại được ngay.
 */
export async function buildNewProductWorkbook(rows: NewProductExportRow[]): Promise<Buffer> {
  const withReason = rows.some((r) => r.reason !== undefined);
  const columns = withReason ? [...NEW_PRODUCT_COLUMNS, REASON_COLUMN] : [...NEW_PRODUCT_COLUMNS];

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Minh Vũ";
  wb.created = new Date();

  const ws = wb.addWorksheet("Mã hàng mới");
  ws.columns = columns.map((c) => ({ header: c.title, key: c.key, width: c.width }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  // Mã hàng dạng chữ: Excel không được tự bỏ số 0 đầu ("0641…" → "641…").
  ws.getColumn("ma_hang").numFmt = "@";

  for (const r of rows) {
    ws.addRow({
      ma_hang: r.code,
      ten_hang: r.name,
      ton_kho: r.stock,
      mo_ta: r.description || null,
      ly_do: r.reason ?? null,
    });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
