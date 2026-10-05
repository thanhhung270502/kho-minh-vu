/**
 * Đối chiếu hàm tách mã với TOÀN BỘ danh mục thật (3.311 mã) — đáp án là cột
 * L–P của file Excel sinh bằng công thức sheet TRA_CUU.
 *
 *   npx tsx scripts/test-product-codes.ts            # dùng bản chụp quy-chuan-ma.csv
 *   npx tsx scripts/test-product-codes.ts --tai-moi  # tải lại sheet trước khi đối chiếu
 *
 * Hai file nằm trong data/quy-chuan/ (dữ liệu thật, không commit — xem README ở đó).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import ExcelJS from "exceljs";

import { buildCodeDictionary, parseProductCode } from "../src/features/product-codes/lib/parse-product-code";
import { readSourceSheet } from "../src/features/product-codes/lib/source-sheet";
import { dictionaryFromEntries, toSyncEntries } from "../src/features/product-codes/lib/sync-entries";

const DIR = "data/quy-chuan";
const CATALOG = join(DIR, "danh-muc-hang-hoa.xlsx");
const SNAPSHOT = join(DIR, "quy-chuan-ma.csv");
const SHEET_CSV_URL = process.env.MA_HOA_SHEET_CSV_URL;

const cellText = (v: unknown): string => {
  if (v === null || v === undefined) return "";
  if (typeof v === "object") return String((v as { result?: unknown; text?: unknown }).result ?? (v as { text?: unknown }).text ?? "");
  return String(v);
};
const same = (a: string, b: string) => a.trim().replace(/\s+/g, " ") === b.trim().replace(/\s+/g, " ");

async function main() {
  if (process.argv.includes("--tai-moi")) {
    assert.ok(SHEET_CSV_URL, "Cần biến MA_HOA_SHEET_CSV_URL (chạy kèm --env-file=.env.local)");
    const res = await fetch(SHEET_CSV_URL);
    assert.ok(res.ok, `Không tải được sheet quy chuẩn mã (HTTP ${res.status})`);
    writeFileSync(SNAPSHOT, await res.text());
  }
  assert.ok(existsSync(CATALOG) && existsSync(SNAPSHOT), `Cần ${CATALOG} và ${SNAPSHOT} — xem ${DIR}/README.md`);

  const sourceRows = readSourceSheet(readFileSync(SNAPSHOT, "utf8"));
  const dict = buildCodeDictionary(sourceRows);
  // Đường thật của app: sheet → bảng ma_hoa → từ điển. Phải cho kết quả y hệt.
  const dbDict = dictionaryFromEntries(toSyncEntries(sourceRows));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(CATALOG);
  const ws = wb.worksheets[0];

  const FIELDS = ["brand", "model", "part", "finish"] as const;
  const COLS = { brand: 12, model: 13, part: 14, finish: 15 }; // L, M, N, O
  const mismatches: string[] = [];
  let total = 0;
  let noteDiff = 0;

  for (let r = 2; r <= ws.rowCount; r++) {
    const row = ws.getRow(r);
    const code = cellText(row.getCell(3).value).trim();
    if (!code) continue;
    total++;
    const parsed = parseProductCode(code, dict);
    for (const f of FIELDS) {
      const expected = cellText(row.getCell(COLS[f]).value);
      if (!same(expected, parsed[f])) mismatches.push(`dòng ${r} ${code} [${f}] file="${expected}" tách="${parsed[f]}"`);
    }
    if (!same(cellText(row.getCell(16).value), parsed.note)) noteDiff++;
    const viaDb = parseProductCode(code, dbDict);
    if (JSON.stringify(viaDb) !== JSON.stringify(parsed)) mismatches.push(`dòng ${r} ${code}: tách qua bảng ma_hoa khác tách thẳng từ sheet`);
  }

  if (mismatches.length > 0) {
    console.error(`✗ quy chuẩn mã: ${mismatches.length} ô lệch / ${total} mã`);
    for (const m of mismatches.slice(0, 30)) console.error("  " + m);
    process.exit(1);
  }
  // Ghi chú chỉ báo — câu chữ phụ thuộc thứ tự lỗi, không chặn.
  console.log(
    `✓ quy chuẩn mã: ${total} mã, Hãng/Dòng/Linh kiện/Xử lý trùng 100%, tách qua bảng ma_hoa y hệt` +
      (noteDiff ? ` (Ghi chú lệch ${noteDiff})` : ""),
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
