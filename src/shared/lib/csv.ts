// File thuần (bẫy 9) — CSV mở bằng Excel, dùng chung cho mọi nút "Xuất CSV".

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
