"use client";

import { Button, Image, Modal } from "antd";
import { useRef, useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useImageActions } from "../hooks/useImageActions";
import { useImageUploadQueue } from "../hooks/useImageUploadQueue";
import { useProductImages } from "../hooks/useProductImages";
import { ACCEPT_ATTRIBUTE } from "../lib/image-rules";
import { imageUrl } from "../lib/image-url";
import { AddImageTile } from "./add-image-tile";
import { ImageThumbStrip } from "./image-thumb-strip";
import { ProductImageGallery } from "./product-image-gallery";

/** Khung ảnh dạng aside của chi tiết mã hàng; "Quản lý" mở lại thư viện đầy đủ (xóa, tải nhiều, chụp ảnh). */
export function ProductImageAside({
  productId,
  canEdit,
}: {
  productId: string;
  canEdit: boolean;
}) {
  const images = useProductImages(productId);
  const actions = useImageActions(productId);
  const queue = useImageUploadQueue(productId);
  const filesRef = useRef<HTMLInputElement>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manageOpen, setManageOpen] = useState(false);

  const list = images.data ?? [];
  const current =
    list.find((i) => i.id === selectedId) ?? list.find((i) => i.isPrimary) ?? list[0] ?? null;

  return (
    <section className="rounded-the border border-vien bg-nen-the p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-[15px] font-extrabold">
          Hình ảnh <span className="font-semibold text-trung-tinh-300">· {list.length}</span>
        </span>
        {canEdit ? (
          <Button size="small" onClick={() => setManageOpen(true)}>
            Quản lý
          </Button>
        ) : null}
      </div>

      {canEdit ? (
        <input
          ref={filesRef}
          type="file"
          hidden
          multiple
          accept={ACCEPT_ATTRIBUTE}
          onChange={(e) => {
            queue.add(e.target.files);
            e.target.value = "";
          }}
        />
      ) : null}

      <QueryState
        query={images}
        isEmpty={(data) => data.length === 0 && !canEdit}
        emptyDescription="Chưa có ảnh cho mã này. Quản lý hoặc văn phòng sẽ bổ sung."
      >
        {() =>
          current === null ? (
            <AddImageTile
              variant="empty"
              onPick={() => filesRef.current?.click()}
              onDropFiles={queue.add}
            />
          ) : (
            <div className="flex flex-col gap-3">
              <div className="aspect-square overflow-hidden rounded-[14px] border border-vien">
                <Image
                  src={imageUrl(current.id)}
                  alt="Ảnh mã hàng"
                  width="100%"
                  height="100%"
                  style={{ objectFit: "cover" }}
                />
              </div>
              {current.isPrimary ? (
                <span className="text-[13.5px] font-bold">★ Ảnh chính</span>
              ) : canEdit ? (
                <Button
                  size="small"
                  loading={actions.pendingId === current.id}
                  onClick={() => actions.setPrimary(current.id)}
                >
                  Đặt làm ảnh chính
                </Button>
              ) : null}
              <ImageThumbStrip
                images={list}
                selectedId={current.id}
                onSelect={setSelectedId}
                canEdit={canEdit}
                onAdd={() => filesRef.current?.click()}
              />
            </div>
          )
        }
      </QueryState>

      {queue.items.length > 0 ? (
        <p className="mt-2 text-[13.5px] text-chu-phu">Đang tải {queue.items.length} ảnh…</p>
      ) : null}

      <Modal
        title="Quản lý hình ảnh"
        open={manageOpen}
        onCancel={() => setManageOpen(false)}
        footer={null}
        width={880}
        destroyOnHidden
      >
        <ProductImageGallery productId={productId} canEdit={canEdit} />
      </Modal>
    </section>
  );
}
