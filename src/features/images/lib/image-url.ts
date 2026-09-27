/**
 * URL đọc ảnh mã hàng — MỘT hàm duy nhất sinh ra, component/hook chỉ biết URL
 * này, không biết nơi lưu (D-06, D-10). Thuần, không alias — dùng chung server/client.
 */

// Tham số URL tiếng Việt không dấu (CLAUDE.md quy ước đặt tên).
export const THUMB_PARAM = { key: "co", value: "nho" } as const;

export type ImageSize = "full" | "thumb";

export function imageUrl(id: string, size: ImageSize = "full"): string {
  return size === "thumb" ? `/anh/${id}?${THUMB_PARAM.key}=${THUMB_PARAM.value}` : `/anh/${id}`;
}
