/**
 * Đọc / ghi file Excel chứng từ. CHỈ CHẠY Ở SERVER (bẫy 7) — hàng rào thật là
 * `node:stream` bên trong `@/shared/lib/excel-cell`.
 */
import ExcelJS from "exceljs";

import { readFirstSheet, readNumber, readString } from "@/shared/lib/excel-cell";

import {
  KIND_COLUMNS,
  KIND_LABELS,
  mapHeaders,
  parseDateCell,
  parseQuantityCell,
  type DocumentFileRow,
  type DocumentKind,
  type FieldKey,
  type ImportMode,
} from "./document-excel";

const MAX_ROWS = 60_000;

export async function readDocumentFile(buf: Buffer, kind: DocumentKind): Promise<DocumentFileRow[]> {
  const sheet = await readFirstSheet(buf);
  const map = mapHeaders(kind, sheet.headers);

  const missing = KIND_COLUMNS[kind].filter(
    (c) => (c.key === "docNo" || c.key === "productCode" || c.key === "quantity") && !map[c.key],
  );
  if (missing.length > 0) {
    throw new Error(
      `Dòng đầu của file phải có cột ${missing.map((c) => `“${c.title}”`).join(", ")}. ` +
        `Tải file mẫu ${KIND_LABELS[kind].one} rồi điền vào đó.`,
    );
  }
  if (sheet.rows.length > MAX_ROWS) {
    throw new Error(`File có ${sheet.rows.length.toLocaleString("vi-VN")} dòng — tối đa ${MAX_ROWS.toLocaleString("vi-VN")} dòng mỗi lần.`);
  }

  const cell = (cells: Record<string, unknown>, key: FieldKey): unknown => {
    const col = map[key];
    return col ? cells[col] : undefined;
  };
  // Mã số dạng số (Excel bỏ định dạng chữ) vẫn đọc đúng: 123 → "123".
  const str = (cells: Record<string, unknown>, key: FieldKey): string => {
    const v = cell(cells, key);
    if (typeof v === "number") return String(readNumber(v) ?? "");
    return readString(v)?.trim() ?? "";
  };

  return sheet.rows.map((raw) => {
    const c = raw.cells;
    const dateCell = cell(c, "date");
    const qtyCell = cell(c, "quantity");
    return {
      row: raw.rowNumber,
      docNo: str(c, "docNo"),
      orderNo: str(c, "orderNo"),
      date: parseDateCell(dateCell),
      dateRaw: dateCell instanceof Date ? "x" : str(c, "date"),
      dueDate: parseDateCell(cell(c, "dueDate")),
      recipientKind: str(c, "recipientKind"),
      partnerCode: str(c, "partnerCode"),
      staff: str(c, "staff"),
      source: str(c, "source"),
      warehouse: str(c, "warehouse"),
      note: str(c, "note"),
      productCode: str(c, "productCode"),
      quantity: parseQuantityCell(qtyCell),
      quantityRaw: str(c, "quantity"),
      lineNote: str(c, "lineNote"),
      negativeReason: str(c, "negativeReason"),
      receiver: str(c, "receiver"),
    };
  });
}

/** Một dòng của file mẫu cập nhật — giá trị đã định dạng để ghi ra ô. */
export type TemplateRow = Partial<Record<FieldKey, string | number | Date | null>>;

/**
 * Sheet 1 = dữ liệu (bộ đọc lấy sheet đầu tiên), sheet 2 = hướng dẫn. Mẫu nhập mới
 * để trống; mẫu cập nhật điền sẵn các phiếu còn nháp để sửa thẳng trên file.
 */
export async function buildDocumentWorkbook(
  kind: DocumentKind,
  mode: ImportMode,
  rows: readonly TemplateRow[],
  /** Tên sheet dữ liệu — mặc định theo kiểu file mẫu; file xuất dùng "Danh sách". */
  sheetName?: string,
): Promise<Buffer> {
  const columns = KIND_COLUMNS[kind].filter((c) => !c.readOnly && !(mode === "moi" && c.infoOnly));
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Minh Vũ";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName ?? (mode === "moi" ? "Nhập mới" : "Cập nhật"));
  ws.columns = columns.map((c) => ({
    header: c.title + (mode === "moi" && c.required ? " *" : ""),
    key: c.key,
    width: c.width,
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  // Mã dạng chữ: Excel không được tự bỏ số 0 đầu.
  for (const key of ["docNo", "orderNo", "partnerCode", "productCode"] as const) {
    if (columns.some((c) => c.key === key)) ws.getColumn(key).numFmt = "@";
  }
  for (const key of ["date", "dueDate"] as const) {
    if (columns.some((c) => c.key === key)) ws.getColumn(key).numFmt = "dd/mm/yyyy";
  }
  for (const r of rows) ws.addRow(r);

  const guide = wb.addWorksheet("Hướng dẫn");
  guide.columns = [
    { header: "Cột", key: "col", width: 22 },
    { header: "Bắt buộc", key: "req", width: 10 },
    { header: "Cách điền", key: "hint", width: 90 },
  ];
  guide.getRow(1).font = { bold: true };
  for (const c of columns) {
    guide.addRow({
      col: c.title,
      req: mode === "moi" && c.required ? "Có" : "",
      hint: c.hint,
    });
  }
  guide.addRow({});
  const notes =
    mode === "moi"
      ? [
          `Mỗi số phiếu tạo một ${KIND_LABELS[kind].one} NHÁP — chưa đụng tồn. Kiểm lại trên web rồi bấm Ghi sổ / Xác nhận.`,
          "Số phiếu đã có trên hệ thống sẽ bị báo lỗi — muốn sửa thì dùng file mẫu cập nhật.",
        ]
      : [
          "Cập nhật chỉ sửa thông tin KHÔNG ảnh hưởng tồn: đối tác, nhân viên nhận, mã đặt hàng, người nhập, ghi chú phiếu, ghi chú dòng, lý do xuất âm (đơn đặt thêm ngày đặt, ngày giao dự kiến). Sửa được cả phiếu đã ghi sổ.",
          "Người tạo và Trạng thái chỉ để xem — sửa trong file không có tác dụng.",
          "Mã hàng, số lượng, số dòng, kho và ngày phiếu phải GIỮ NGUYÊN — khác là báo lỗi. Muốn đổi những thứ này thì hủy phiếu rồi lập phiếu mới.",
          "Ô để trống = giữ nguyên giá trị đang có.",
          "Chỉ sửa đầu phiếu: xóa trống cột Mã hàng và Số lượng ở mọi dòng của phiếu đó.",
        ];
  for (const n of notes) guide.addRow({ col: "Lưu ý", hint: n });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
