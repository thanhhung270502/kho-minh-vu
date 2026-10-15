/**
 * Đọc / ghi file Excel "Nhập mã hàng mới" — cùng 9 cột với file cập nhật mã hàng.
 * CHỈ CHẠY Ở SERVER (bẫy 7).
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
import { docCo } from "./read-catalog-file.server";

const text = (value: unknown) => readString(value)?.trim() ?? "";

export async function readNewProductFile(buf: Buffer): Promise<NewProductFileRow[]> {
  const sheet = await readFirstSheet(buf, { requiredHeader: "ma_hang" });

  // "Tên hàng" được để trống (cả cột): route tự điền từ sheet tên hàng chuẩn.
  if (!sheet.headers.includes("ma_hang")) {
    throw new Error(
      "Không thấy cột “Mã hàng” trong file. Tải file mẫu rồi điền vào đó. " +
        (sheet.rawHeaders.length ? `Các cột đọc được: ${sheet.rawHeaders.filter(Boolean).join(", ")}.` : "File không có dòng nào."),
    );
  }

  return sheet.rows.map((raw) => {
    const cells = raw.cells;
    const problems: string[] = [];
    // File cập nhật xuất ra ghi "Tồn kho"; giữ "tong_ton" phòng ai đổi tiêu đề theo tên trường.
    const stockCell = cells.ton_kho ?? cells.tong_ton;
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
      code: text(cells.ma_hang),
      name: readString(cells.ten_hang)?.trim().replace(/\s+/g, " ") ?? "",
      nameFromSheet: false,
      stock,
      // Mẫu cũ có cột "Ghi chú" — vẫn nhận, vào Mô tả (như file cập nhật).
      description: text(cells.mo_ta ?? cells.ghi_chu),
      problems,
      // Tên cột cũ ("ĐVT", "Công đoạn", "Kho mặc định") vẫn nhận, như parseTemplateRow.
      lookupText: {
        category: text(cells.nhom_hang),
        unit: text(cells.don_vi_tinh ?? cells.dvt),
        stage: text(cells.xu_ly ?? cells.cong_doan),
        warehouse: text(cells.vi_tri ?? cells.kho_mac_dinh),
      },
      isActive: docCo(cells.dang_kinh_doanh),
    };
  });
}

const GUIDE: Array<[string, string]> = [
  ["Bố cục", "Giống file cập nhật mã hàng — file xuất ra từ danh mục cũng nhập được ở đây."],
  ["Mã hàng, Tên hàng", "Bắt buộc. Tên để trống thì tự điền từ sheet tên hàng chuẩn (sửa được ở màn xem trước)."],
  ["Nhóm hàng / Đơn vị tính / Xử lý", "Tên hoặc mã đã có. Không khớp thì màn xem trước báo lỗi để chọn lại."],
  ["Đơn vị tính", "Để trống = Cái."],
  ["Xử lý", "Để trống = Mua ngoài."],
  ["Tồn kho", "Tồn ban đầu, ghi vào kho chọn trên màn nhập (một phiếu điều chỉnh). Để trống = 0."],
  ["Đang kinh doanh", "Ghi 1 / 0 (hoặc Có / Không). Để trống = đang kinh doanh."],
  ["Vị trí", "Kho mặc định của mã — tên hoặc mã kho. Để trống = kho ghi tồn."],
];

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

  // Khóa cột = ColumnKey của TEMPLATE_COLUMNS (excel-template.ts).
  for (const r of rows) {
    ws.addRow({
      ma_hang: r.code,
      ten_hang: r.name,
      nhom_hang: r.category || null,
      tong_ton: r.stock,
      dvt: r.unit || null,
      cong_doan: r.stage || null,
      dang_kinh_doanh: r.isActive === undefined ? null : r.isActive ? 1 : 0,
      mo_ta: r.description || null,
      kho_mac_dinh: r.warehouse || null,
      ly_do: r.reason ?? null,
    });
  }

  if (!withReason) {
    const guide = wb.addWorksheet("Hướng dẫn");
    guide.columns = [
      { header: "Cột", key: "cot", width: 34 },
      { header: "Cách điền", key: "cach", width: 90 },
    ];
    guide.getRow(1).font = { bold: true };
    for (const [cot, cach] of GUIDE) guide.addRow({ cot, cach });
  }

  return Buffer.from(await wb.xlsx.writeBuffer());
}
