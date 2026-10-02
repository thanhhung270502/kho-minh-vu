// File thuần (bẫy 9): component client, route handler và scripts/test-*.ts cùng
// import. Hợp đồng của file Excel "Nhập mã hàng mới" (Phase 15, IMP-01/03).
import { removeDiacritics } from "@/shared/lib/text";

/** `key` = tiêu đề đã chuẩn hóa (normalizeHeader) — bộ đọc khớp theo đó, không theo vị trí. */
export const NEW_PRODUCT_COLUMNS = [
  { key: "ma_hang", title: "Mã hàng", width: 18 },
  { key: "ten_hang", title: "Tên hàng", width: 42 },
  { key: "ton_kho", title: "Tồn kho", width: 12 },
  { key: "mo_ta", title: "Mô tả", width: 42 },
] as const;

export const REASON_COLUMN = { key: "ly_do", title: "Lý do", width: 50 } as const;

/** Một dòng đọc từ file. `problems` là lỗi đọc được ngay ở server (tồn không phải số…). */
export type NewProductFileRow = {
  row: number;
  code: string;
  name: string;
  stock: number;
  description: string;
  problems: string[];
};

/** Dòng ghi ra file lỗi / file mẫu. */
export type NewProductExportRow = {
  code: string;
  name: string;
  stock: number | null;
  description: string;
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
