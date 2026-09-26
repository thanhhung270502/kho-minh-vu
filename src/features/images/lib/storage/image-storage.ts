/**
 * Interface trung lập cho nơi lưu ảnh mã hàng — D-10. Component, hook, Route Handler
 * chỉ biết tới ba hàm dưới đây; đổi Google Drive sang Supabase Storage/R2 sau này là
 * thêm một bản cài đặt (implements ImageStorage), không sửa chỗ gọi.
 */

export type StorageBackend = "GDRIVE"; // thêm "SUPABASE" | "R2" khi có implementation (D-04)

export type ImageVariant = "full" | "thumb";

export type ImageStorageErrorKind = "forbidden" | "bad_request" | "not_found" | "unavailable";

export class ImageStorageError extends Error {
  constructor(
    readonly kind: ImageStorageErrorKind,
    message: string,
  ) {
    super(message);
    this.name = "ImageStorageError";
  }
}

export interface ImageStorage {
  readonly backend: StorageBackend;
  /** Lưu ảnh, trả về khóa lưu (fileId của backend) để ghi vào hinh_anh.khoa_luu. */
  put(input: { variant: ImageVariant; fileName: string; bytes: Uint8Array }): Promise<string>;
  /**
   * Đọc ảnh theo khóa lưu. Có `cacheTag` thì dùng Next.js Data Cache (force-cache),
   * không có thì luôn gọi backend (no-store) — D-23.
   */
  get(key: string, options?: { cacheTag?: string }): Promise<{ bytes: Uint8Array; contentType: string }>;
  /** Xóa ảnh (đưa vào thùng rác của backend, D-21). Không tìm thấy coi như đã xóa. */
  remove(key: string): Promise<void>;
}
