"use client";

import { StarFilled } from "@ant-design/icons";
import Image from "next/image";

import { imageUrl } from "../lib/image-url";
import type { ProductImage } from "../types";

/** Dải ảnh nhỏ dưới ảnh lớn: viền đen ở ảnh đang xem, ô "+ Thêm" ở cuối cho người sửa được. */
export function ImageThumbStrip({
  images,
  selectedId,
  onSelect,
  canEdit,
  onAdd,
}: {
  images: ProductImage[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  canEdit: boolean;
  onAdd: () => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {images.map((image) => (
        <button
          key={image.id}
          type="button"
          aria-pressed={image.id === selectedId}
          onClick={() => onSelect(image.id)}
          className={`relative size-14 overflow-hidden rounded-[10px] ${
            image.id === selectedId ? "ring-2 ring-chu-chinh" : "ring-1 ring-vien"
          }`}
        >
          <Image
            src={imageUrl(image.id, "thumb")}
            alt="Ảnh mã hàng"
            width={56}
            height={56}
            unoptimized
            className="size-full object-cover"
          />
          {image.isPrimary ? (
            <StarFilled className="absolute left-0.5 top-0.5 text-[11px] text-amber-400" />
          ) : null}
        </button>
      ))}
      {canEdit ? (
        <button
          type="button"
          onClick={onAdd}
          className="flex size-14 items-center justify-center rounded-[10px] border border-dashed border-trung-tinh-300 text-xs text-chu-phu"
        >
          + Thêm
        </button>
      ) : null}
    </div>
  );
}
