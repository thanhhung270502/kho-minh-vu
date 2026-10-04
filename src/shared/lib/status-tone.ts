// File thuần — lib của feature (không "use client") import được để khai báo
// tông màu cho từng trạng thái.

/**
 * Tông trạng thái của design system 1A — màu chỉ để báo hiệu:
 * - `pending`: còn việc phải làm (nhập liệu, đơn tạm, chờ duyệt) — cam
 * - `active`: đang chạy, chưa xong (đã xác nhận, đang đếm) — xám đậm
 * - `done`: đã chốt (ghi sổ, hoàn thành, đang dùng) — mực đen
 * - `danger`: cần xử lý gấp (hết hàng, tồn âm, lệch lớn) — đỏ
 * - `muted`: không còn hiệu lực (đã hủy, ngừng) — xám
 */
export type StatusTone = "pending" | "active" | "done" | "danger" | "muted";
