"use client";

import { PictureOutlined } from "@ant-design/icons";
import { Image } from "antd";
import { useState } from "react";

import { useProductImages } from "../hooks/useProductImages";
import { imageUrl } from "../lib/image-url";

type Props = {
  productId: string;
  primaryImageId: string | null;
};

/**
 * Ô thumbnail 40×40 ở bảng danh mục — ô xám khi chưa có ảnh (D-17); bấm vào
 * ảnh chính phóng to tại chỗ, qua lại được với mọi ảnh khác của mã đó (D-16).
 * Chỉ tải danh sách ảnh khi người dùng thật sự mở preview.
 */
export function ProductThumbnailCell({ productId, primaryImageId }: Props) {
  const [open, setOpen] = useState(false);
  const images = useProductImages(productId, { enabled: open });

  if (primaryImageId === null) {
    return (
      <div
        className="flex size-10 items-center justify-center rounded bg-gray-100"
        aria-label="Chưa có ảnh"
        title="Chưa có ảnh"
      >
        <PictureOutlined className="text-gray-300" />
      </div>
    );
  }

  const items = images.data?.length
    ? images.data.map((image) => imageUrl(image.id))
    : [imageUrl(primaryImageId)];
  const startIndex = images.data?.length
    ? Math.max(
        images.data.findIndex((image) => image.id === primaryImageId),
        0,
      )
    : 0;

  return (
    <Image.PreviewGroup items={items} preview={{ open, onOpenChange: setOpen, current: startIndex }}>
      <Image
        src={imageUrl(primaryImageId, "thumb")}
        width={40}
        height={40}
        className="rounded object-cover"
        loading="lazy"
        alt="Ảnh chính"
        preview={false}
        onClick={() => setOpen(true)}
      />
    </Image.PreviewGroup>
  );
}
