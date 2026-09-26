/**
 * Cài đặt ImageStorage lưu qua Google Drive bằng một Apps Script web app — D-05, D-08.
 *
 * KHÔNG import gói chặn build ngoài react-server: `scripts/copy-kiotviet-images` (09-12)
 * và `scripts/test-image-storage.ts` import file này để chạy ngoài Next.js, mà gói đó
 * ném lỗi khi chạy ngoài điều kiện react-server. Hàng rào "chỉ chạy ở server" thật sự
 * nằm ở nơi gọi (`index.server.ts`, Route Handler) — file này chỉ gọi `fetch`
 * và `Buffer`, không đụng gì đặc thù Next.js.
 *
 * Hợp đồng JSON với apps-script/Code.gs (09-02): request luôn có {secret, action, ...};
 * response LUÔN HTTP 200 — lỗi nghiệp vụ nằm trong body {ok:false, error, message}
 * (Pitfall 4, 09-RESEARCH.md). Không được coi `res.ok` (chỉ báo HTTP) là đủ.
 */
import { z } from "zod";

import {
  ImageStorageError,
  type ImageStorage,
  type ImageStorageErrorKind,
  type ImageVariant,
} from "./image-storage";

type Options = {
  url: string;
  secret: string;
  fetchImpl?: typeof fetch;
};

// Next.js augment RequestInit toàn cục trong ngữ cảnh app, nhưng file này được
// script tsx import (ngoài Next) — khai cục bộ để không phụ thuộc kiểu đó.
type NextFetchInit = RequestInit & { next?: { tags?: string[] } };

const FOLDER_BY_VARIANT: Record<ImageVariant, "san-pham/goc" | "san-pham/thumb"> = {
  full: "san-pham/goc",
  thumb: "san-pham/thumb",
};

const ERROR_KIND_BY_APPS_SCRIPT_ERROR: Record<string, ImageStorageErrorKind> = {
  forbidden: "forbidden",
  bad_request: "bad_request",
  not_found: "not_found",
  internal: "unavailable",
};

const errorBodySchema = z.object({
  ok: z.literal(false),
  error: z.enum(["forbidden", "bad_request", "not_found", "internal"]),
  message: z.string(),
});

const okBodySchema = z.object({ ok: z.literal(true) }).passthrough();

export class GDriveImageStorage implements ImageStorage {
  readonly backend = "GDRIVE" as const;

  constructor(private readonly options: Options) {}

  async put(input: { variant: ImageVariant; fileName: string; bytes: Uint8Array }): Promise<string> {
    const body = await this.call(
      {
        action: "put",
        folder: FOLDER_BY_VARIANT[input.variant],
        fileName: input.fileName,
        mimeType: "image/webp",
        base64Data: Buffer.from(input.bytes).toString("base64"),
      },
      { cache: "no-store" },
    );
    const fileId = typeof body.fileId === "string" ? body.fileId : "";
    if (fileId === "") {
      throw new ImageStorageError("unavailable", "Apps Script không trả fileId hợp lệ khi lưu ảnh");
    }
    return fileId;
  }

  async get(key: string, options?: { cacheTag?: string }): Promise<{ bytes: Uint8Array; contentType: string }> {
    // Có cacheTag mới dùng Data Cache — lần xem thứ hai không gọi Apps Script (D-23).
    // Lưu ý: response lỗi ok:false cũng là HTTP 200 nên CÓ THỂ bị Data Cache giữ lại —
    // Route Handler (09-06) phải revalidateTag(tag, { expire: 0 }) khi bắt ImageStorageError.
    const init: NextFetchInit = options?.cacheTag
      ? { cache: "force-cache", next: { tags: [options.cacheTag] } }
      : { cache: "no-store" };
    const body = await this.call({ action: "get", fileId: key }, init);
    const mimeType = typeof body.mimeType === "string" ? body.mimeType : "";
    const base64Data = typeof body.base64Data === "string" ? body.base64Data : "";
    if (mimeType === "" || base64Data === "") {
      throw new ImageStorageError("unavailable", "Apps Script không trả đủ dữ liệu ảnh");
    }
    return { bytes: new Uint8Array(Buffer.from(base64Data, "base64")), contentType: mimeType };
  }

  async remove(key: string): Promise<void> {
    try {
      await this.call({ action: "remove", fileId: key }, { cache: "no-store" });
    } catch (error) {
      // Không tìm thấy file trên Drive coi như mục tiêu (đã xóa) đã đạt — D-21.
      if (error instanceof ImageStorageError && error.kind === "not_found") {
        return;
      }
      throw error;
    }
  }

  private async call(payload: Record<string, unknown>, init: NextFetchInit): Promise<Record<string, unknown>> {
    const fetchImpl = this.options.fetchImpl ?? fetch;

    let res: Response;
    try {
      res = await fetchImpl(this.options.url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ secret: this.options.secret, ...payload }),
        redirect: "follow",
        ...init,
      });
    } catch {
      throw new ImageStorageError("unavailable", "Không gọi được Apps Script");
    }

    if (!res.ok) {
      throw new ImageStorageError("unavailable", `Apps Script trả HTTP ${res.status}`);
    }

    let json: unknown;
    try {
      json = await res.json();
    } catch {
      throw new ImageStorageError("unavailable", "Apps Script trả nội dung không phải JSON");
    }

    // Apps Script luôn trả HTTP 200 — lỗi nghiệp vụ nằm ở ok:false trong body,
    // phải kiểm RIÊNG chứ không chỉ dựa vào res.ok ở trên (Pitfall 4).
    const errorParsed = errorBodySchema.safeParse(json);
    if (errorParsed.success) {
      const kind = ERROR_KIND_BY_APPS_SCRIPT_ERROR[errorParsed.data.error] ?? "unavailable";
      throw new ImageStorageError(kind, errorParsed.data.message);
    }

    const okParsed = okBodySchema.safeParse(json);
    if (!okParsed.success) {
      throw new ImageStorageError("unavailable", "Apps Script trả phản hồi không đúng khuôn");
    }

    return okParsed.data;
  }
}
