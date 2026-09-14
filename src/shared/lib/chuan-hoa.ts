/** Bỏ dấu tiếng Việt, giữ hoa/thường. Nguồn dùng chung cho đăng nhập, Excel, tìm kiếm phía client. */
export function boDau(v: string): string {
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export const MIEN_EMAIL_NOI_BO = "khominhvu.local";

export function chuanHoaTenDangNhap(v: string): string {
  return boDau(v)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

/** D-01: người dùng gõ tên, Supabase Auth cần email. Đã gõ đủ email nội bộ thì giữ nguyên. */
export function tenDangNhapThanhEmail(v: string): string {
  const s = v.trim().toLowerCase();
  if (s.endsWith(`@${MIEN_EMAIL_NOI_BO}`)) return s;
  return `${chuanHoaTenDangNhap(s)}@${MIEN_EMAIL_NOI_BO}`;
}
