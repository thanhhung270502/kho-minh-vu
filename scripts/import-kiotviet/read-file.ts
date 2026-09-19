/**
 * Logic thật nằm ở `src/shared/lib/excel-cell.ts` — dùng chung với luồng nhập Excel
 * của ứng dụng (D-22). Ở đây chỉ còn lớp mỏng đọc theo đường dẫn file.
 */
import { existsSync } from "node:fs";

import { readFirstSheet, type RawRow } from "../../src/shared/lib/excel-cell";

export { readString, readExcelDate, readNumber, type RawRow } from "../../src/shared/lib/excel-cell";

export async function docSheet(duongDan: string): Promise<RawRow[]> {
  if (!existsSync(duongDan)) {
    throw new Error(
      `Không tìm thấy file: ${duongDan}\n` +
        `Cách xử lý: đặt bốn file export KiotViet vào thư mục data/kiotviet/.\n` +
        `Xem data/kiotviet/README.md để biết tên file cần đặt.`,
    );
  }

  const { rows } = await readFirstSheet(duongDan);
  return rows;
}
