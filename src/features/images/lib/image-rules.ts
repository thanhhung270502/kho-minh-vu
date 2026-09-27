/**
 * Quy tắc kích thước/định dạng ảnh mã hàng — dùng chung cho trình duyệt (nén),
 * Route Handler (kiểm lại) và script chép ảnh KiotViet. KHÔNG "use client" và
 * KHÔNG import alias `@/`: script tsx import file này bằng đường dẫn tương đối
 * (CLAUDE.md bẫy 9).
 */

export const FULL_MAX_EDGE = 1200;
export const THUMB_MAX_EDGE = 300;
export const FULL_QUALITY = 0.8;
export const THUMB_QUALITY = 0.75;
export const FALLBACK_QUALITY = 0.6;

// base64 ~1,33 MB: dưới xa giới hạn 2 MB của Data Cache và 4,5 MB body Vercel.
export const MAX_FULL_BYTES = 1_000_000;
export const MAX_THUMB_BYTES = 150_000;
export const MAX_PICKED_BYTES = 30 * 1024 * 1024;

// Nhận nhiều định dạng đầu vào — đầu ra luôn chuẩn hóa về WebP (JPEG trên iPhone)
// nên nơi lưu không cần biết ảnh gốc là gì. GIF động chỉ giữ khung đầu.
// KHÔNG liệt kê image/heic trong `accept`: iOS tự đổi HEIC → JPEG khi accept không có
// HEIC (research Pitfall 5). HEIC chọn từ nơi khác vẫn được thử đọc (Safari đọc được).
export const ACCEPTED_IMAGE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/bmp",
  "image/avif",
] as const;
export const ACCEPT_ATTRIBUTE = ACCEPTED_IMAGE_TYPES.join(",");

// Một số trình chọn file (Android, Zalo, file tải về) để trống `type` — nhận theo đuôi.
const ACCEPTED_EXTENSIONS = /\.(jpe?g|png|webp|gif|bmp|avif|heic|heif)$/i;
const ACCEPTED_LABEL = "JPEG, PNG, WebP, GIF, BMP, AVIF hoặc HEIC";

export type ImageProblem = { title: string; action: string };

export function scaleToFit(
  width: number,
  height: number,
  maxEdge: number,
): { width: number; height: number } {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

export function isHeic(name: string, type: string): boolean {
  if (type === "image/heic" || type === "image/heif") return true;
  return /\.(heic|heif)$/i.test(name);
}

export function checkPickedFile(file: {
  name: string;
  type: string;
  size: number;
}): ImageProblem | null {
  if (file.size === 0) {
    return { title: "File ảnh rỗng", action: "Chọn lại ảnh khác." };
  }
  if (file.size > MAX_PICKED_BYTES) {
    return { title: "Ảnh lớn hơn 30 MB", action: "Chụp lại hoặc thu nhỏ ảnh rồi chọn lại." };
  }
  const knownType = ACCEPTED_IMAGE_TYPES.includes(
    file.type as (typeof ACCEPTED_IMAGE_TYPES)[number],
  );
  // HEIC không chặn ở đây: Safari đọc được, trình duyệt khác báo lỗi riêng lúc đọc ảnh.
  if (!knownType && !isHeic(file.name, file.type) && !ACCEPTED_EXTENSIONS.test(file.name)) {
    return {
      title: "Định dạng ảnh không hỗ trợ",
      action: `Chỉ nhận ảnh ${ACCEPTED_LABEL}.`,
    };
  }
  return null;
}

/**
 * Tên file Drive an toàn suy từ mã hàng: `${safeFileStem(ma_hang)}__${uuid}.<webp|jpg>`
 * (D-08) — Apps Script chỉ nhận `[A-Za-z0-9._-]`.
 */
export function safeFileStem(code: string): string {
  const boDau = code
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D");
  const antoan = boDau.replace(/[^A-Za-z0-9._-]+/g, "_").replace(/^_+|_+$/g, "");
  const cat = antoan.slice(0, 80);
  return cat.length > 0 ? cat : "ma-hang";
}

export function isWebp(bytes: Uint8Array): boolean {
  if (bytes.length < 12) return false;
  const isRiff =
    bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
  const isWebpTag =
    bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;
  return isRiff && isWebpTag;
}

export type StoredImageFormat = {
  mimeType: "image/webp" | "image/jpeg";
  extension: "webp" | "jpg";
};

/**
 * Định dạng ảnh đã nén nhận lưu. JPEG là đường dự phòng cho WebKit (Safari và mọi
 * trình duyệt trên iPhone) — canvas ở đó không mã hóa được WebP.
 */
export function detectImageFormat(bytes: Uint8Array): StoredImageFormat | null {
  if (isWebp(bytes)) return { mimeType: "image/webp", extension: "webp" };
  const isJpeg =
    bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  return isJpeg ? { mimeType: "image/jpeg", extension: "jpg" } : null;
}
