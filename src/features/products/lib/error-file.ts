import type { ImportErrorRow } from "../api/excel-import.api";
import { columnLabel } from "./excel-template";

function csvCell(value: string | number): string {
  const text = String(value);
  // Chỉ bọc nháy khi cần, và nhân đôi nháy bên trong — quy tắc RFC 4180.
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Danh sách lỗi dạng CSV để mở bằng Excel.
 *
 * Dùng CSV chứ không .xlsx: exceljs bản cho trình duyệt nặng và không có tùy
 * chọn bỏ qua styles. BOM (`﻿`) ở đầu là bắt buộc — thiếu nó Excel trên
 * Windows đọc UTF-8 thành ANSI và tiếng Việt thành ký tự rác.
 */
export function buildErrorCsv(errors: ImportErrorRow[]): Blob {
  const rows = [
    ["Dòng", "Cột", "Lỗi"],
    ...errors.map((error) => [
      error.row,
      columnLabel(error.column),
      error.message,
    ]),
  ];

  const content =
    "﻿" + rows.map((row) => row.map(csvCell).join(",")).join("\r\n");

  return new Blob([content], { type: "text/csv;charset=utf-8" });
}

export function errorFileName(sourceName: string): string {
  return `${sourceName.replace(/\.xlsx$/i, "")}-loi.csv`;
}
