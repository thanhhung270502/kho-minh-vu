/**
 * In header và vài dòng mẫu của mọi file .xlsx trong data/kiotviet/.
 *
 *   npx tsx scripts/import-kiotviet/xem-cot.ts
 *
 * Dùng khi KiotViet đổi định dạng export, hoặc khi dry-run báo lỗi hàng loạt
 * trên cùng một cột — gần như chắc chắn là tên cột đã đổi.
 *
 * Dùng reader dạng STREAM với styles: "ignore". Reader thường
 * (`workbook.xlsx.readFile`) crash trên file KiotViet:
 *   TypeError: Cannot read properties of undefined (reading 'styles')
 * vì phần styles.xml của file export lệch chuẩn.
 */
import ExcelJS from "exceljs";
import { readdirSync } from "node:fs";
import path from "node:path";

import { doChuoi } from "./doc-file";

const THU_MUC = process.argv[2] ?? path.join("data", "kiotviet");

async function main() {
  const files = readdirSync(THU_MUC).filter((f) => f.endsWith(".xlsx") && !f.startsWith("~$")).sort();

  for (const f of files) {
    const reader = new ExcelJS.stream.xlsx.WorkbookReader(path.join(THU_MUC, f), {
      sharedStrings: "cache",
      hyperlinks: "ignore",
      styles: "ignore",
      worksheets: "emit",
    });

    console.log(`\n══ ${f}`);
    let soSheet = 0;

    for await (const ws of reader) {
      soSheet++;
      if (soSheet > 1) {
        console.log(`   (có thêm sheet thứ ${soSheet} — script chỉ đọc sheet đầu)`);
        continue;
      }

      let header: string[] = [];
      let soDong = 0;
      let dongCuoi: string[] = [];

      for await (const row of ws) {
        soDong++;
        const values = (row.values as unknown[]) ?? [];
        const text = values.map((v) => doChuoi(v) ?? "");

        if (soDong === 1) {
          header = text;
          const cot = header.map((h, i) => [i, h] as const).filter(([, h]) => h);
          console.log(`   ${cot.length} cột:`);
          for (const [i, h] of cot) console.log(`     [${i}] ${h}`);
        } else if (soDong <= 3) {
          const cap = header
            .map((h, i) => (h ? `${h}=${JSON.stringify(text[i] ?? "").slice(0, 32)}` : ""))
            .filter(Boolean);
          console.log(`   dòng ${soDong}: ${cap.slice(0, 12).join(" | ")}`);
        }
        dongCuoi = text;
      }

      console.log(`   tổng ${soDong} dòng kể cả header`);
      console.log(`   dòng cuối: ${dongCuoi.slice(1, 6).map((v) => JSON.stringify(v).slice(0, 26)).join(" | ")}`);
    }
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
