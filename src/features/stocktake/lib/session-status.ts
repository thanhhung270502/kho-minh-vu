/**
 * Nhãn trạng thái phiên kiểm kê hiển thị trên giao diện. Tính từ tiến độ đếm,
 * KHÔNG lưu cột riêng trên database (nguyên tắc kiến trúc số 1 — tồn/trạng
 * thái hiển thị là kết quả, không phải dữ liệu nhập tay).
 */
export type SessionStatus = "new" | "counting" | "ready" | "approved" | "voided";

export const SESSION_STATUS_LABELS: Record<SessionStatus, string> = {
  new: "Mới mở",
  counting: "Đang đếm",
  ready: "Chờ duyệt",
  approved: "Đã duyệt",
  voided: "Đã hủy",
};

/** Màu `Tag` antd tương ứng từng trạng thái. */
export const SESSION_STATUS_COLORS: Record<SessionStatus, string> = {
  new: "default",
  counting: "processing",
  ready: "warning",
  approved: "success",
  voided: "error",
};

export type SessionStatusInput = {
  state: "NHAP_LIEU" | "HOAN_THANH" | "DA_HUY";
  /** Số dòng đã có số đếm (`so_dem` khác null). */
  counted: number;
  /** Tổng số mã hàng trong phạm vi phiên. */
  scope: number;
  /** Số dòng đang được đánh dấu đếm lại. */
  recount: number;
};

export function sessionStatus(input: SessionStatusInput): SessionStatus {
  if (input.state === "HOAN_THANH") return "approved";
  if (input.state === "DA_HUY") return "voided";

  // NHAP_LIEU: chưa ghi sổ — trạng thái suy từ tiến độ đếm hiện tại.
  if (input.counted === 0) return "new";
  if (input.counted < input.scope) return "counting";

  // Đã đếm đủ phạm vi — còn dòng chờ đếm lại thì vẫn coi là đang đếm.
  return input.recount > 0 ? "counting" : "ready";
}
