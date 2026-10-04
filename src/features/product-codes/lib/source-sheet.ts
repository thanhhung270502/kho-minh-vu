// File thuần: đọc CSV xuất từ sheet "Quy chuẩn mã" (job đồng bộ + script đối chiếu).
// Sheet do bên khác sửa hằng ngày — cấu trúc lệch thì DỪNG, không đoán, để job
// không ghi đè từ điển bằng dữ liệu hỏng.
import type { CodeSourceRow } from "./parse-product-code";

export const SOURCE_HEADERS = [
  "1.HÃNG XE", "MÃ HÓA",
  "2.DÒNG XE", "MÃ HÓA",
  "4.LINH KIỆN", "MÃ HÓA",
  "5.XỬ LÝ", "MÃ HÓA",
  "6.MÀU", "MÃ HÓA",
] as const;

export class SourceSheetError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SourceSheetError";
  }
}

/** CSV RFC 4180 tối giản: ngoặc kép, "" thoát, xuống dòng CRLF/LF. */
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
      } else {
        field += c;
      }
    } else if (c === '"') {
      quoted = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

const normalizeHeader = (value: string) => value.trim().replace(/\s+/g, " ").toUpperCase();

export function readSourceSheet(csv: string): CodeSourceRow[] {
  const [header = [], ...body] = parseCsv(csv.replace(/^﻿/, ""));

  SOURCE_HEADERS.forEach((expected, index) => {
    const actual = header[index] ?? "";
    if (normalizeHeader(actual) !== normalizeHeader(expected)) {
      throw new SourceSheetError(
        `Sheet quy chuẩn mã đổi cấu trúc: cột ${index + 1} là "${actual}", cần "${expected}". ` +
          "Không cập nhật bộ mã hóa — báo bên làm mã hoặc sửa job đồng bộ.",
      );
    }
  });

  return body
    .map((cells) => {
      const c = (i: number) => (cells[i] ?? "").trim();
      return {
        brand: c(0), brandCode: c(1),
        model: c(2), modelCode: c(3),
        part: c(4), partCode: c(5),
        finish: c(6), finishCode: c(7),
        color: c(8), colorCode: c(9),
      };
    })
    .filter((r) => Object.values(r).some((v) => v !== ""));
}
