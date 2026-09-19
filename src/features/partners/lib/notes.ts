/**
 * Hàm thuần cho màn Rà ghi chú — không import supabase, không import React, để
 * `scripts/test-pure-functions.ts` kiểm được bằng node:assert.
 */

/**
 * Tên đề xuất khi tạo khách từ ô Ghi chú KiotViet.
 *
 * Ghi chú thật hay có dạng nhiều dòng: dòng 1 là tên (kèm địa chỉ), dòng 2 là
 * SĐT hoặc ghi chú giao hàng. Chỉ lấy dòng đầu và viết hoa chữ cái đầu mỗi từ —
 * người dùng vẫn sửa được trước khi lưu.
 */
export function suggestCustomerName(value: string): string {
  const firstLine = value.split(/\r?\n/)[0] ?? "";

  return firstLine
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi")
    .split(" ")
    .map((word) =>
      word ? word.charAt(0).toLocaleUpperCase("vi") + word.slice(1) : word,
    )
    .join(" ");
}

/** SĐT đầu tiên tìm được trong ghi chú, để điền sẵn form tạo khách. */
export function extractPhoneNumber(value: string): string | null {
  const match = value.replace(/[.\-\s]/g, "").match(/(0\d{9,10})/);
  return match ? match[1] : null;
}

/** Rút gọn để nhét vào thông báo mà không vỡ dòng. */
export function truncate(value: string, maxLength = 30): string {
  const compact = value.replace(/\s+/g, " ").trim();
  return compact.length <= maxLength
    ? compact
    : `${compact.slice(0, maxLength - 1)}…`;
}
