import { buildCsv } from "@/shared/lib/csv";

import type { ImportErrorRow } from "../api/excel-import.api";
import { columnLabel } from "./excel-template";

/** Danh sách lỗi import dạng CSV để mở bằng Excel (khuôn chung ở shared/lib/csv). */
export function buildErrorCsv(errors: ImportErrorRow[]): Blob {
  return buildCsv(
    ["Dòng", "Cột", "Lỗi"],
    errors.map((error) => [error.row, columnLabel(error.column), error.message]),
  );
}

export function errorFileName(sourceName: string): string {
  return `${sourceName.replace(/\.xlsx$/i, "")}-loi.csv`;
}
