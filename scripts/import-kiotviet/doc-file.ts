/**
 * Logic thật nằm ở `src/shared/lib/o-excel.ts` — dùng chung với luồng nhập Excel
 * của ứng dụng (D-22). Ở đây chỉ còn lớp mỏng đọc theo đường dẫn file.
 */
import { existsSync } from "node:fs";

import { docSheetDau, type DongTho } from "../../src/shared/lib/o-excel";

export { doChuoi, doNgayExcel, doSo, type DongTho } from "../../src/shared/lib/o-excel";

export async function docSheet(duongDan: string): Promise<DongTho[]> {
  if (!existsSync(duongDan)) {
    throw new Error(
      `Không tìm thấy file: ${duongDan}\n` +
        `Cách xử lý: đặt bốn file export KiotViet vào thư mục data/kiotviet/.\n` +
        `Xem data/kiotviet/README.md để biết tên file cần đặt.`,
    );
  }

  const { dong } = await docSheetDau(duongDan);
  return dong;
}
