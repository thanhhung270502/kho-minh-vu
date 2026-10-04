/**
 * Nén + lưu ảnh mã hàng dùng chung cho các script nạp ảnh
 * (copy-kiotviet-images, import-anh-nhap). Cùng quy tắc nén với app
 * (image-rules): WebP, cạnh dài tối đa, chất lượng hạ dần nếu vượt dung lượng.
 */
import type { GDriveImageStorage } from "../src/features/images/lib/storage/gdrive-storage.server";
import { ImageStorageError } from "../src/features/images/lib/storage/image-storage";
import { FALLBACK_QUALITY } from "../src/features/images/lib/image-rules";

export type SharpFn = (typeof import("sharp"))["default"];

export async function nenAnh(
  sharp: SharpFn,
  buf: Buffer,
  maxEdge: number,
  quality: number,
  maxBytes: number,
): Promise<Buffer> {
  let out = await sharp(buf)
    .rotate()
    .resize({
      width: maxEdge,
      height: maxEdge,
      fit: "inside",
      withoutEnlargement: true,
    })
    .webp({ quality: Math.round(quality * 100) })
    .toBuffer();
  if (out.byteLength > maxBytes) {
    out = await sharp(buf)
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .webp({ quality: Math.round(FALLBACK_QUALITY * 100) })
      .toBuffer();
  }
  return out;
}

/** Dừng toàn bộ khi Apps Script từ chối secret — không có cách tự phục hồi. */
export class DungToanBo extends Error {}

/**
 * Lưu một biến thể ảnh, KHÔNG tự thử lại ở đây.
 *
 * `put` không idempotent: "unavailable" (timeout, 5xx) không có nghĩa là Apps
 * Script chưa ghi — file có thể đã nằm trên Drive. Thử lại mù sẽ đẻ file trùng
 * mồ côi, và Apps Script không có action liệt kê/tra theo tên để kiểm trước.
 * Nên lỗi được ném ra; script gọi coi mã đó là thất bại và lần chạy sau làm lại
 * (vẫn có thể còn một file mồ côi, nhưng chỉ một, và có dấu vết trong log).
 * Tên hàm giữ nguyên để không phải sửa hai script đang gọi.
 */
export async function luuVoiThuLai(
  storage: GDriveImageStorage,
  variant: "full" | "thumb",
  fileName: string,
  bytes: Buffer,
): Promise<string> {
  try {
    return await storage.put({
      variant,
      fileName,
      mimeType: "image/webp",
      bytes: new Uint8Array(bytes),
    });
  } catch (e) {
    if (e instanceof ImageStorageError && e.kind === "forbidden") {
      throw new DungToanBo(
        "Secret Apps Script sai — kiểm APPS_SCRIPT_SECRET",
      );
    }
    throw e;
  }
}
