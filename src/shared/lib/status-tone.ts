// File thuần — lib của feature (không "use client") import được để khai báo
// tông màu cho từng trạng thái.

/**
 * Tông trạng thái (theme trắng – xanh dương) — màu chỉ để báo hiệu:
 * - `pending`: còn việc phải làm (nhập liệu, đơn tạm, chờ duyệt) — cam
 * - `active`: đang chạy, chưa xong (đã xác nhận, đang đếm) — xanh dương
 * - `done`: đã chốt (ghi sổ, hoàn thành, đang dùng) — xanh lá
 * - `complete`: đã kết thúc trọn vẹn (đơn hoàn thành) — xanh lá
 * - `danger`: cần xử lý gấp (hết hàng, tồn âm, lệch lớn) — đỏ
 * - `muted`: không còn hiệu lực (đã hủy, ngừng) — xám
 */
export type StatusTone = "pending" | "active" | "done" | "complete" | "danger" | "muted";
