/** Bỏ dấu tiếng Việt, giữ hoa/thường. Nguồn dùng chung cho đăng nhập, Excel, tìm kiếm phía client. */
export function removeDiacritics(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
}

export const INTERNAL_EMAIL_DOMAIN = "khominhvu.local";

export function normalizeUsername(value: string): string {
  return removeDiacritics(value)
    .toLowerCase()
    .replace(/[^a-z0-9._-]/g, "");
}

/** D-01: người dùng gõ tên, Supabase Auth cần email. Đã gõ đủ email nội bộ thì giữ nguyên. */
export function usernameToEmail(value: string): string {
  const trimmed = value.trim().toLowerCase();
  if (trimmed.endsWith(`@${INTERNAL_EMAIL_DOMAIN}`)) return trimmed;
  return `${normalizeUsername(trimmed)}@${INTERNAL_EMAIL_DOMAIN}`;
}
