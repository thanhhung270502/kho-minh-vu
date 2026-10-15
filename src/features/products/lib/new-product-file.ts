// File thuần (bẫy 9): component client, route handler và scripts/test-*.ts cùng
// import. Hợp đồng của file Excel "Nhập mã hàng mới" (Phase 15, IMP-01/03).
import { removeDiacritics } from "@/shared/lib/text";

import { TEMPLATE_COLUMNS } from "./excel-template";

/**
 * Cùng bố cục với file "Cập nhật mã hàng" (TEMPLATE_COLUMNS, 9 cột) — một file dùng
 * được cho cả hai màn. Bộ đọc khớp theo tiêu đề đã chuẩn hóa (normalizeHeader), không
 * theo vị trí, nên file 4 cột cũ (Mã hàng, Tên hàng, Tồn kho, Mô tả) vẫn nhập được.
 * `key` chỉ là khóa cột của exceljs khi ghi file.
 */
export const NEW_PRODUCT_COLUMNS = TEMPLATE_COLUMNS.map(({ key, title, width }) => ({ key, title, width }));

export const REASON_COLUMN = { key: "ly_do", title: "Lý do", width: 50 } as const;

/** Chữ trong các ô danh mục của file — màn xem trước khớp ra id (theo mã hoặc tên). */
export type LookupText = {
  category: string;
  unit: string;
  stage: string;
  warehouse: string;
};

/** Một dòng đọc từ file. `problems` là lỗi đọc được ngay ở server (tồn không phải số…). */
export type NewProductFileRow = {
  row: number;
  code: string;
  name: string;
  /** Tên lấy từ sheet tên hàng chuẩn vì ô tên trong file để trống. */
  nameFromSheet: boolean;
  stock: number;
  description: string;
  problems: string[];
  /** Nhóm hàng / Đơn vị tính / Xử lý / Vị trí trong file; vắng = file 4 cột cũ. */
  lookupText?: LookupText;
  /** Ô "Đang kinh doanh"; null = để trống. */
  isActive?: boolean | null;
};

/** Dòng ghi ra file lỗi / file mẫu — cùng 9 cột với file cập nhật. */
export type NewProductExportRow = {
  code: string;
  name: string;
  category?: string;
  stock: number | null;
  unit?: string;
  stage?: string;
  isActive?: boolean;
  description: string;
  warehouse?: string;
  reason?: string;
};

const normalizeCode = (code: string) => code.trim().toLowerCase();

/** Cùng quy tắc với `chuan_hoa_ten` (0081): bỏ dấu, không hoa thường, gộp khoảng trắng. */
export function normalizeName(name: string): string {
  return removeDiacritics(name).trim().replace(/\s+/g, " ").toLowerCase();
}

/**
 * Trùng mã / tên TRONG file — báo ngay ở màn xem trước, trước cả khi gọi RPC.
 * Mọi dòng trùng đều bị đánh dấu (không giữ dòng đầu): không đoán được dòng nào đúng.
 */
export function duplicateProblemsInFile(
  rows: ReadonlyArray<{ row: number; code: string; name: string }>,
): Map<number, string[]> {
  const result = new Map<number, string[]>();
  const add = (row: number, message: string) => result.set(row, [...(result.get(row) ?? []), message]);

  const check = (key: (r: (typeof rows)[number]) => string, label: string) => {
    const groups = new Map<string, number[]>();
    for (const r of rows) {
      const k = key(r);
      if (k !== "") groups.set(k, [...(groups.get(k) ?? []), r.row]);
    }
    for (const group of groups.values()) {
      if (group.length < 2) continue;
      for (const row of group) {
        const others = group.filter((other) => other !== row).join(", ");
        add(row, `${label} trùng với dòng ${others}`);
      }
    }
  };

  check((r) => normalizeCode(r.code), "Mã hàng");
  check((r) => normalizeName(r.name), "Tên hàng");
  return result;
}
