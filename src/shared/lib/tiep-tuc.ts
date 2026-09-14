/** D-35: chỉ nhận đường dẫn nội bộ. Chặn open redirect. Không quay về chính /dang-nhap. */
export function tiepTucAnToan(gt: string | null | undefined): string {
  if (
    !gt ||
    !gt.startsWith("/") ||
    gt.startsWith("//") ||
    gt.startsWith("/\\") ||
    gt.includes("://")
  ) {
    return "/";
  }
  if (gt === "/dang-nhap" || gt.startsWith("/dang-nhap?")) return "/";
  return gt;
}
