import "server-only";

import { getProductNameSheetUrl } from "@/lib/env-server";

import { readProductNameSheet } from "../lib/product-name-sheet";

export type ProductNameSheet = { names: Map<string, string>; error: string | null };

/**
 * Tải sheet tên hàng chuẩn. Cache 1 giờ: sheet đổi theo ngày, mỗi lần nhập file
 * không cần tải lại ~8.000 dòng. Tải lỗi KHÔNG chặn nhập file — chỉ không tự điền,
 * và trả câu báo để màn xem trước nói cho người dùng biết vì sao ô tên còn trống.
 */
export async function loadProductNameSheet(): Promise<ProductNameSheet> {
  const unavailable = "Không tải được sheet tên hàng chuẩn nên chưa tự điền tên. Gõ tên vào ô trống, hoặc thử lại sau ít phút.";
  try {
    const response = await fetch(getProductNameSheetUrl(), {
      next: { revalidate: 3600 },
      // Google treo thì nhập file vẫn phải đi tiếp — quá 15 giây coi như tải lỗi.
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return { names: new Map(), error: unavailable };
    return { names: readProductNameSheet(await response.text()), error: null };
  } catch {
    return { names: new Map(), error: unavailable };
  }
}
