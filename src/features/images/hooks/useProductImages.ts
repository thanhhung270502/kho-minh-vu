import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { productKeys } from "@/features/products/api/product.keys";

import {
  deleteProductImage,
  fetchProductImages,
  setPrimaryImage,
  uploadProductImage,
} from "../api/image.api";
import { imageKeys } from "../api/image.keys";
import { compressImage } from "../lib/compress-image";

export function useProductImages(
  productId: string,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: imageKeys.product(productId),
    queryFn: () => fetchProductImages(productId),
    // Ngăn gọi mạng với id rỗng (bẫy 10) — component gọi hook trước khi mã có id.
    enabled: productId !== "" && (options?.enabled ?? true),
  });
}

/** Cả ba mutation làm mới thư viện ảnh của mã và bảng danh mục (cột thumbnail). */
function useRefreshImages(productId: string) {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({
      queryKey: imageKeys.product(productId),
    });
    void queryClient.invalidateQueries({ queryKey: productKeys.lists });
  };
}

export type UploadStage = "compressing" | "uploading";

export function useUploadProductImage(productId: string) {
  const refresh = useRefreshImages(productId);

  return useMutation({
    // onStage cho giao diện hiện đúng bước đang chạy — nén trên máy hay gửi lên nơi lưu.
    mutationFn: async ({
      file,
      onStage,
    }: {
      file: File;
      onStage?: (stage: UploadStage) => void;
    }) => {
      onStage?.("compressing");
      const files = await compressImage(file);
      onStage?.("uploading");
      return uploadProductImage(productId, files);
    },
    onSuccess: refresh,
    // Một file lỗi giữa lô nhiều file vẫn phải làm mới những file đã lên trước đó.
    onSettled: refresh,
  });
}

export function useSetPrimaryImage(productId: string) {
  const refresh = useRefreshImages(productId);

  return useMutation({
    mutationFn: (imageId: string) => setPrimaryImage(imageId),
    onSuccess: refresh,
  });
}

export function useDeleteProductImage(productId: string) {
  const refresh = useRefreshImages(productId);

  return useMutation({
    mutationFn: (imageId: string) => deleteProductImage(imageId),
    onSuccess: refresh,
  });
}
