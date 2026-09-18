/**
 * Hàm thuần cho màn Rà ghi chú — không import supabase, không import React, để
 * `scripts/kiem-tra-ham-thuan.ts` kiểm được bằng node:assert.
 */

/**
 * Tên đề xuất khi tạo khách từ ô Ghi chú KiotViet.
 *
 * Ghi chú thật hay có dạng nhiều dòng: dòng 1 là tên (kèm địa chỉ), dòng 2 là
 * SĐT hoặc ghi chú giao hàng. Chỉ lấy dòng đầu và viết hoa chữ cái đầu mỗi từ —
 * người dùng vẫn sửa được trước khi lưu.
 */
export function goiYTenKhach(giaTri: string): string {
  const dongDau = giaTri.split(/\r?\n/)[0] ?? "";

  return dongDau
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi")
    .split(" ")
    .map((tu) => (tu ? tu.charAt(0).toLocaleUpperCase("vi") + tu.slice(1) : tu))
    .join(" ");
}

/** SĐT đầu tiên tìm được trong ghi chú, để điền sẵn form tạo khách. */
export function tachSoDienThoai(giaTri: string): string | null {
  const khop = giaTri.replace(/[.\-\s]/g, "").match(/(0\d{9,10})/);
  return khop ? khop[1] : null;
}

/** Rút gọn để nhét vào thông báo mà không vỡ dòng. */
export function rutGon(giaTri: string, toiDa = 30): string {
  const mot = giaTri.replace(/\s+/g, " ").trim();
  return mot.length <= toiDa ? mot : `${mot.slice(0, toiDa - 1)}…`;
}
