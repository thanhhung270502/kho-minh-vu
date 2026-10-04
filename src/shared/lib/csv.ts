// File thuần (bẫy 9) — CSV mở bằng Excel (nút "Xuất CSV") và đọc CSV sheet công khai.

export type CsvValue = string | number | null | undefined;

function csvCell(value: CsvValue): string {
  const text = value === null || value === undefined ? "" : String(value);
  // Chỉ bọc nháy khi cần, và nhân đôi nháy bên trong — quy tắc RFC 4180.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Dùng CSV chứ không .xlsx: exceljs bản cho trình duyệt nặng. BOM ở đầu là bắt
 * buộc — thiếu nó Excel trên Windows đọc UTF-8 thành ANSI, tiếng Việt thành rác.
 */
export function buildCsv(headers: string[], rows: CsvValue[][]): Blob {
  const content = "﻿" + [headers, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
  return new Blob([content], { type: "text/csv;charset=utf-8" });
}

/** Tải Blob về máy với tên file cho sẵn. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
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
