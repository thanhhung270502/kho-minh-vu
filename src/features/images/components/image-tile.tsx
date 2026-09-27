"use client";

import { Button, Image, Popconfirm, Tag } from "antd";

import { imageUrl } from "../lib/image-url";
import type { ProductImage } from "../types";

/**
 * Một ô ảnh trong thư viện — bấm phóng to (bọc bởi `Image.PreviewGroup` của
 * component cha), có thể đặt làm ảnh chính / xóa khi `canEdit`.
 */
export function ImageTile({
  image,
  canEdit,
  busy,
  onSetPrimary,
  onDelete,
}: {
  image: ProductImage;
  canEdit: boolean;
  busy: boolean;
  onSetPrimary: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="flex w-[120px] flex-col items-center gap-1">
      <div className="relative">
        <Image
          src={imageUrl(image.id, "thumb")}
          preview={{ src: imageUrl(image.id) }}
          width={120}
          height={120}
          className="rounded object-cover"
          alt="Ảnh mã hàng"
        />
        {image.isPrimary ? (
          <Tag color="blue" className="absolute left-1 top-1">
            Ảnh chính
          </Tag>
        ) : null}
      </div>
      {canEdit ? (
        <div className="flex items-center gap-2">
          {!image.isPrimary ? (
            <Button
              type="link"
              size="small"
              disabled={busy}
              onClick={() => onSetPrimary(image.id)}
            >
              Đặt làm ảnh chính
            </Button>
          ) : null}
          <Popconfirm
            title="Xóa ảnh này?"
            description="Ảnh chính bị xóa thì ảnh kế tiếp tự lên thay."
            okText="Xóa"
            cancelText="Không"
            onConfirm={() => onDelete(image.id)}
          >
            <Button type="link" danger size="small" disabled={busy}>
              Xóa
            </Button>
          </Popconfirm>
        </div>
      ) : null}
    </div>
  );
}
