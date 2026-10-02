import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";

import { readSelectedId, withSelectedId } from "@/shared/lib/selected-id";

import { readFilterFromUrl, writeFilterToUrl, type ProductFilter } from "../schemas/filter.schema";

/**
 * Trạng thái bảng danh mục nằm trên URL: bộ lọc + mã đang mở chi tiết (`?chon=`).
 * Gửi link, tải lại trang, bấm Back đều giữ nguyên.
 */
export function useProductTableUrl() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo(() => readFilterFromUrl(searchParams), [searchParams]);
  const selectedId = readSelectedId(searchParams);

  const replaceUrl = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // Đổi bộ lọc/trang vẫn giữ chi tiết đang mở.
  const navigate = useCallback(
    (next: ProductFilter) => replaceUrl(withSelectedId(writeFilterToUrl(next), selectedId)),
    [replaceUrl, selectedId],
  );

  const selectProduct = useCallback(
    (id: string | null) => replaceUrl(withSelectedId(searchParams, id)),
    [replaceUrl, searchParams],
  );

  // Bấm lại đúng dòng đang mở thì đóng.
  const toggleProduct = useCallback(
    (id: string) => selectProduct(id === selectedId ? null : id),
    [selectProduct, selectedId],
  );

  return { filter, selectedId, navigate, selectProduct, toggleProduct };
}
