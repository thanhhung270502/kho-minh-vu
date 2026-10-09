// File thuần (bẫy 9): sheet tên hàng chuẩn — 2 cột (mã, tên), không dòng tiêu đề.
// Route đọc file nhập mã mới và file *.test.ts cùng import.
import { parseCsv } from "@/shared/lib/csv";

import type { NewProductFileRow } from "./new-product-file";

const toKey = (code: string) => code.trim().toLowerCase();

/**
 * Mã → tên. Bỏ dòng thiếu mã hoặc thiếu tên (sheet có dòng rác "--,"). Mã lặp thì
 * giữ dòng đầu: sheet do người sửa tay, dòng trên thường là dòng gốc.
 */
export function readProductNameSheet(csv: string): Map<string, string> {
  const names = new Map<string, string>();
  for (const [code = "", name = ""] of parseCsv(csv.replace(/^﻿/, ""))) {
    const key = toKey(code);
    const clean = name.trim().replace(/\s+/g, " ");
    if (key === "" || clean === "" || names.has(key)) continue;
    names.set(key, clean);
  }
  return names;
}

/** Chỉ điền ô tên đang trống — tên người dùng đã gõ trong file luôn thắng sheet. */
export function fillNamesFromSheet(rows: NewProductFileRow[], names: Map<string, string>): NewProductFileRow[] {
  return rows.map((r) => {
    if (r.name !== "") return r;
    const name = names.get(toKey(r.code));
    return name ? { ...r, name, nameFromSheet: true } : r;
  });
}
