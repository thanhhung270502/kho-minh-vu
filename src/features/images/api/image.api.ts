import { z } from "zod";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import { IMAGE_COLUMNS, toProductImage, type ProductImage } from "../types";

/**
 * Lỗi gọi route ảnh (`/api/anh/tai-len`, `/api/anh/xoa`) có sẵn câu tiếng Việt
 * do route handler soạn — không cần dịch lại (khuôn `ExcelImportError`).
 */
export class ImageRequestError extends Error {
  constructor(
    readonly title: string,
    readonly action: string,
    readonly status: number,
  ) {
    super(`${title}. ${action}`);
    this.name = "ImageRequestError";
  }
}

async function readRouteError(
  response: Response,
  fallbackTitle: string,
): Promise<ImageRequestError> {
  if (response.status === 401) {
    // Cần tải lại hẳn trang đăng nhập, không dùng router.push: cache TanStack
    // Query của phiên cũ phải bị bỏ đi cùng.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign(
      `/dang-nhap?tiep_tuc=${encodeURIComponent(window.location.pathname + window.location.search)}`,
    );
  }

  let title = fallbackTitle;
  let action = "Thử lại sau ít phút. Nếu vẫn lỗi, báo quản trị.";
  try {
    const body = (await response.json()) as { title?: string; action?: string };
    title = body.title ?? title;
    action = body.action ?? action;
  } catch {
    /* server trả không phải JSON — giữ câu mặc định */
  }

  return new ImageRequestError(title, action, response.status);
}

/**
 * Lấy danh sách ảnh còn sống của một mã — ảnh chính đứng đầu, rồi theo `thu_tu`.
 * Không lọc thêm cột xóa mềm (cột đó không được grant → 42501; RLS đã tự ẩn ảnh đã xóa).
 */
export async function fetchProductImages(productId: string): Promise<ProductImage[]> {
  const { data, error } = await getSupabaseBrowserClient()
    .from("hinh_anh")
    .select(IMAGE_COLUMNS)
    .eq("san_pham_id", productId)
    .order("la_anh_chinh", { ascending: false })
    .order("thu_tu")
    .order("created_at");
  if (error) throw error;

  return (data ?? []).map(toProductImage);
}

/** Ảnh chính theo danh sách mã — dùng để tô cột thumbnail bảng danh mục. */
export async function fetchPrimaryImageIds(
  productIds: string[],
): Promise<Record<string, string>> {
  if (productIds.length === 0) return {};

  const { data, error } = await getSupabaseBrowserClient()
    .from("hinh_anh")
    .select("id, san_pham_id")
    .in("san_pham_id", productIds)
    .eq("la_anh_chinh", true);
  if (error) throw error;

  const result: Record<string, string> = {};
  for (const row of data ?? []) {
    result[row.san_pham_id] = row.id;
  }
  return result;
}

export async function setPrimaryImage(imageId: string): Promise<void> {
  const { error } = await getSupabaseBrowserClient().rpc("dat_anh_chinh", {
    p_id: imageId,
  });
  if (error) throw error;
}

const uploadResponseSchema = z.object({
  id: z.string().uuid(),
  isPrimary: z.boolean(),
});

export async function uploadProductImage(
  productId: string,
  files: { full: Blob; thumb: Blob },
): Promise<{ id: string; isPrimary: boolean }> {
  const form = new FormData();
  form.set("san_pham_id", productId);
  form.set("goc", new File([files.full], "goc.webp", { type: "image/webp" }));
  form.set("nho", new File([files.thumb], "nho.webp", { type: "image/webp" }));

  const response = await fetch("/api/anh/tai-len", { method: "POST", body: form });
  if (!response.ok) {
    throw await readRouteError(response, "Không tải được ảnh lên");
  }

  return uploadResponseSchema.parse(await response.json());
}

const deleteResponseSchema = z.object({
  driveTrashed: z.boolean(),
});

export async function deleteProductImage(
  imageId: string,
): Promise<{ driveTrashed: boolean }> {
  const response = await fetch("/api/anh/xoa", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: imageId }),
  });
  if (!response.ok) {
    throw await readRouteError(response, "Không xóa được ảnh");
  }

  return deleteResponseSchema.parse(await response.json());
}
