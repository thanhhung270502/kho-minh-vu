/**
 * Factory chọn implementation ImageStorage — chỗ DUY NHẤT trong app chọn nơi lưu
 * theo `hinh_anh.noi_luu`. Chỉ chạy ở server: đọc APPS_SCRIPT_URL/SECRET qua
 * getAppsScriptEnv() (env-server.ts, cũng server-only).
 */
import "server-only";

import { getAppsScriptEnv } from "@/lib/env-server";

import { GDriveImageStorage } from "./gdrive-storage.server";
import { ImageStorageError, type ImageStorage } from "./image-storage";

export function getImageStorage(backend?: string): ImageStorage {
  if (backend === undefined || backend === "GDRIVE") {
    const { APPS_SCRIPT_URL, APPS_SCRIPT_SECRET } = getAppsScriptEnv();
    return new GDriveImageStorage({ url: APPS_SCRIPT_URL, secret: APPS_SCRIPT_SECRET });
  }
  throw new ImageStorageError("bad_request", `Chưa hỗ trợ nơi lưu ${backend}`);
}

export { ImageStorageError } from "./image-storage";
export type { ImageStorage, ImageVariant, StorageBackend } from "./image-storage";
