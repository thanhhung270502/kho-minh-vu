/** Sinh file "nhập mới" bằng buildDocumentWorkbook (giống route /mau) — dữ liệu test TEST1510-*. */
import { writeFileSync } from "node:fs";

import { buildDocumentWorkbook } from "@/features/document-excel/lib/document-excel-file.server";

const dir = process.argv[2] ?? ".";
const suffix = process.argv[3] ?? "1";
const d = new Date(Date.UTC(2026, 9, 15));
const sp = ["06410KFL850", "06410KSP900", "06410KWB600"];

async function main() {
  writeFileSync(`${dir}/don-dat.xlsx`, await buildDocumentWorkbook("don-dat", "moi", [
    { docNo: "TDD1510-" + suffix, date: d, partnerCode: "NB001", note: "test", productCode: sp[0], quantity: 2 },
    { docNo: "TDD1510-" + suffix, productCode: sp[1], quantity: 3 },
  ]));
  writeFileSync(`${dir}/hoa-don.xlsx`, await buildDocumentWorkbook("hoa-don", "moi", [
    { docNo: "THD1510-" + suffix, date: d, partnerCode: "NB001", productCode: sp[0], quantity: 1 },
    { docNo: "THD1510-" + suffix, productCode: sp[2], quantity: 1 },
  ]));
  writeFileSync(`${dir}/phieu-nhap.xlsx`, await buildDocumentWorkbook("phieu-nhap", "moi", [
    { docNo: "TPN1510-" + suffix, date: d, partnerCode: "NCC000001", productCode: sp[0], quantity: 5 },
    { docNo: "TPN1510-" + suffix, productCode: sp[1], quantity: 5 },
  ]));
}
main();
