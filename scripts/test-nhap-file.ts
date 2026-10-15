/**
 * Test nhánh loi1510/test_loi_khong_nhap_file — đọc file Excel chứng từ bằng đúng
 * bộ đọc của route /api/chung-tu-excel/<loai>/nhap, in payload gửi RPC.
 *   npx tsx scripts/test-nhap-file.ts <loai> <file.xlsx> [out.json]
 */
import { readFileSync, writeFileSync } from "node:fs";

import { groupDocuments, isDocumentKind } from "@/features/document-excel/lib/document-excel";
import { readDocumentFile } from "@/features/document-excel/lib/document-excel-file.server";
import { NEGATIVE_REASON_LABELS } from "@/features/documents/lib/negative-reasons";

async function main() {
  const [kind, file, out] = process.argv.slice(2);
  if (!kind || !file || !isDocumentKind(kind)) throw new Error("usage: <don-dat|hoa-don|phieu-nhap> <file> [out]");
  const rows = await readDocumentFile(readFileSync(file), kind);
  const { documents, issues } = groupDocuments(rows, NEGATIVE_REASON_LABELS as Record<string, string>);
  console.log(`${file}: ${rows.length} dòng → ${documents.length} phiếu, ${issues.length} lỗi đọc`);
  for (const i of issues.slice(0, 10)) console.log("  lỗi:", i);
  console.log("  phiếu đầu:", JSON.stringify(documents[0])?.slice(0, 600));
  if (out) writeFileSync(out, JSON.stringify(documents));
}
main().catch((e) => {
  console.error("THROW:", e instanceof Error ? e.message : e);
  process.exit(1);
});
