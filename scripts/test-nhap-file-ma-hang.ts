/** Sinh file "Nhập mã hàng mới" (4 cột) bằng buildNewProductWorkbook — mã test TEST1510-*. */
import { writeFileSync } from "node:fs";

import { buildNewProductWorkbook } from "@/features/products/lib/read-new-product-file.server";

async function main() {
  const out = process.argv[2] ?? "ma-hang-moi.xlsx";
  writeFileSync(out, await buildNewProductWorkbook([
    { code: "TEST1510-A", name: "Hàng test 1510 A", stock: 5, description: "test" },
    { code: "TEST1510-B", name: "", stock: 0, description: "" },
  ]));
}
main();
