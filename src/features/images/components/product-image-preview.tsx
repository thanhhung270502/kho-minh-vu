"use client";

import { PictureOutlined } from "@ant-design/icons";
import { Image } from "antd";
import { useState } from "react";

import { useProductImages } from "../hooks/useProductImages";
import { imageUrl } from "../lib/image-url";

/** Ảnh chính cỡ lớn ở panel chi tiết — bấm vào phóng to, lướt qua mọi ảnh của mã. */
export function ProductImagePreview({ productId }: { productId: string }) {
  const images = useProductImages(productId);
  // Nơi lưu ảnh (Apps Script) đôi khi lỗi ở lần lấy đầu → route trả 502 và tự xóa
  // cache. Thẻ <img> không tự tải lại, nên thử lại MỘT lần với URL khác đi.
  const [retried, setRetried] = useState(false);

  if (images.isPending) return <div className="h-48 w-full animate-pulse rounded bg-gray-100" aria-label="Đang tải ảnh" />;

  const list = images.data ?? [];
  if (list.length === 0) {
    return (
      <div className="flex h-32 flex-col items-center justify-center gap-1 rounded bg-gray-100 text-xs text-gray-400">
        <PictureOutlined className="text-2xl" />
        {images.isError ? "Không tải được ảnh" : "Chưa có ảnh"}
      </div>
    );
  }

  const primary = list.find((image) => image.isPrimary) ?? list[0];
  return (
    <Image.PreviewGroup items={list.map((image) => imageUrl(image.id))}>
      <Image
        src={retried ? `${imageUrl(primary.id)}?thu_lai=1` : imageUrl(primary.id)}
        onError={() => setRetried(true)}
        alt="Ảnh chính"
        className="max-h-56 w-full rounded object-contain"
        rootClassName="block w-full"
      />
    </Image.PreviewGroup>
  );
}
