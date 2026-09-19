/**
 * D-35: chỉ nhận đường dẫn nội bộ. Chặn open redirect. Không quay về chính /dang-nhap.
 *
 * Tên tham số truy vấn `tiep_tuc` giữ tiếng Việt: nó nằm trên thanh địa chỉ,
 * là bề mặt người dùng nhìn thấy.
 */
export function safeRedirectPath(value: string | null | undefined): string {
  if (
    !value ||
    !value.startsWith("/") ||
    value.startsWith("//") ||
    value.startsWith("/\\") ||
    value.includes("://")
  ) {
    return "/";
  }
  if (value === "/dang-nhap" || value.startsWith("/dang-nhap?")) return "/";
  return value;
}
