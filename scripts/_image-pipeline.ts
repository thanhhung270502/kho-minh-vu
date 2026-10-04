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

export async function luuVoiThuLai(
  storage: GDriveImageStorage,
  variant: "full" | "thumb",
  fileName: string,
  bytes: Buffer,
): Promise<string> {
  const cho = [0, 1000, 3000];
  let lanCuoi: unknown;
  for (let lan = 0; lan < cho.length; lan++) {
    if (cho[lan]! > 0) await new Promise((r) => setTimeout(r, cho[lan]));
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
      lanCuoi = e;
      if (!(e instanceof ImageStorageError && e.kind === "unavailable"))
        throw e;
    }
  }
  throw lanCuoi instanceof Error
    ? lanCuoi
    : new Error("Không lưu được ảnh sau nhiều lần thử");
}
