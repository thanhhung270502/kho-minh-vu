/**
 * Đọc hai cột mã hàng + tồn từ file danh mục KiotViet để nạp tồn tạm (D-05).
 * CHỈ CHẠY Ở SERVER (Route Handler `/api/ton-kho/nap-tam`).
 *
 * KHÔNG dùng `import "server-only"`, cùng lý do với `read-catalog-file.server.ts`:
 * script kiểm chạy ngoài điều kiện `react-server` phải import được. Hàng rào thật
 * là `node:stream` bên trong `@/shared/lib/excel-cell` — import nhầm vào Client
 * Component là build hỏng ngay.
 *
 * Không dùng `readCatalogFile`: nạp tồn tạm không phải nghiệp vụ "nhập danh mục",
 * không cần nhận dạng mẫu file hay tách ĐVT–công đoạn. Vẫn đi qua `readFirstSheet`
 * để giữ cả hai đường đọc (stream rồi mới tới reader thường — Bẫy 7).
 */
import {
  readFirstSheet,
  readNumber,
  readString,
} from "@/shared/lib/excel-cell";

/**
 * Khóa `ma_hang` / `so_luong` giữ snake_case tiếng Việt CÓ CHỦ ĐÍCH: đây là hợp đồng
 * jsonb gửi thẳng cho RPC `nap_ton_tam` (0061 đọc `v_dong->>'ma_hang'` và
 * `v_dong->>'so_luong'`), cùng lý do với khóa gửi cho `nhap_danh_muc`.
 */
export type ProvisionalStockRow = {
  ma_hang: string | null;
  so_luong: number | null;
};

/**
 * Tên cột sau khi `readFirstSheet` chuẩn hóa tiêu đề ("Mã hàng" → `ma_hang`,
 * "Tồn kho" → `ton_kho`) — đúng khóa `scripts/import-kiotviet` đang đọc.
 */
const CODE_COLUMN = "ma_hang";
const STOCK_COLUMN = "ton_kho";

export async function readStockFile(
  buf: Buffer,
): Promise<ProvisionalStockRow[]> {
  const sheet = await readFirstSheet(buf);

  if (
    !sheet.headers.includes(CODE_COLUMN) ||
    !sheet.headers.includes(STOCK_COLUMN)
  ) {
    throw new Error(
      "Dòng đầu của file phải có hai cột “Mã hàng” và “Tồn kho”. Dùng đúng file danh mục KiotViet xuất ra (DanhSachSanPham_KV…), không đổi tên cột.",
    );
  }

  return sheet.rows.map((row) => ({
    ma_hang: readString(row.cells[CODE_COLUMN]),
    so_luong: readNumber(row.cells[STOCK_COLUMN]),
  }));
}

/**
 * Mã xuất hiện trên hơn một dòng. RPC không gộp dòng trùng — nạp cả hai sẽ cộng
 * đôi tồn của mã đó, nên route chặn cả file trước khi gọi RPC. So khớp đúng như
 * RPC (`ma_hang = trim(...)`, phân biệt hoa thường); `readString` đã trim sẵn.
 */
export function findDuplicateCodes(rows: ProvisionalStockRow[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const row of rows) {
    if (!row.ma_hang) continue;
    if (seen.has(row.ma_hang)) duplicates.add(row.ma_hang);
    seen.add(row.ma_hang);
  }

  return [...duplicates];
}
