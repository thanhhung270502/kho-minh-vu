/**
 * Đọc file mẫu đếm kiểm kê đã điền số đếm. CHỈ CHẠY Ở SERVER (Route Handler
 * `/api/kiem-ke/nhap-excel`).
 *
 * KHÔNG dùng `import "server-only"` — cùng lý do `read-stock-file.server.ts`:
 * `scripts/test-excel-reader.ts` phải import được. Hàng rào thật là `node:stream`
 * bên trong `@/shared/lib/excel-cell`.
 */
import { readFirstSheet, readNumber, readString } from "@/shared/lib/excel-cell";

/**
 * Khóa `ma_hang` / `so_dem` giữ snake_case tiếng Việt CÓ CHỦ ĐÍCH: đây là hợp
 * đồng jsonb gửi thẳng cho RPC `nhap_so_dem_kiem_ke` (0065 đọc
 * `v_dong->>'ma_hang'` và `v_dong->>'so_dem'`), cùng lý do với khóa gửi cho
 * `nap_ton_tam`/`nhap_danh_muc`.
 *
 * `so_dem` giữ kiểu `number | string | null` thay vì luôn chuyển về số: ô có
 * chữ không đọc được thành số (gõ nhầm) được GIỮ NGUYÊN CHUỖI để RPC tự báo lỗi
 * "Số đếm không phải là số" (nhánh `invalid_text_representation`, 0065) đúng
 * dòng — quy về `null` ở đây sẽ lặng lẽ biến gõ nhầm thành "chưa đếm" (D-07,
 * sai nghĩa).
 */
export type CountFileRow = {
  ma_hang: string | null;
  so_dem: number | string | null;
};

const CODE_COLUMN = "ma_hang";
const COUNT_COLUMN = "so_dem";

export async function readCountFile(buf: Buffer): Promise<CountFileRow[]> {
  const sheet = await readFirstSheet(buf);

  if (!sheet.headers.includes(CODE_COLUMN) || !sheet.headers.includes(COUNT_COLUMN)) {
    throw new Error(
      "Dòng đầu của file phải có hai cột “Mã hàng” và “Số đếm”. Dùng đúng file mẫu hệ vừa xuất ra, không đổi tên cột.",
    );
  }

  return sheet.rows.map((row) => {
    const raw = row.cells[COUNT_COLUMN];
    const isBlank = raw === null || raw === undefined || raw === "";

    let so_dem: number | string | null;
    if (isBlank) {
      so_dem = null;
    } else {
      const num = readNumber(raw);
      so_dem = num !== null ? num : readString(raw);
    }

    return {
      ma_hang: readString(row.cells[CODE_COLUMN]),
      so_dem,
    };
  });
}
