"use client";

import { CameraOutlined } from "@ant-design/icons";
import { Button, Image, Skeleton } from "antd";
import { useRef } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useImageUploadQueue } from "../hooks/useImageUploadQueue";
import { useImageActions } from "../hooks/useImageActions";
import { useProductImages } from "../hooks/useProductImages";
import { ACCEPT_ATTRIBUTE } from "../lib/image-rules";
import { AddImageTile } from "./add-image-tile";
import { ImageTile } from "./image-tile";
import { UploadTile } from "./upload-tile";

const GRID = "grid grid-cols-3 gap-2 sm:grid-cols-4 sm:gap-3 lg:grid-cols-6";

/**
 * Mục "Hình ảnh" trong chi tiết mã hàng (D-15/D-16): lưới ảnh vuông, bấm ảnh phóng to
 * tại chỗ; ảnh đang tải hiện ngay trong lưới kèm tiến độ; ô cuối là "Thêm ảnh"
 * (bấm hoặc kéo thả). Người không có quyền sửa chỉ xem.
 */
export function ProductImageGallery({
  productId,
  canEdit,
}: {
  productId: string;
  canEdit: boolean;
}) {
  const images = useProductImages(productId);
  const queue = useImageUploadQueue(productId);
  const actions = useImageActions(productId);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const count = images.data?.length ?? 0;
  const hasAnything = count > 0 || queue.items.length > 0;

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-900">
          Hình ảnh
          {count > 0 ? (
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
              {count}
            </span>
          ) : null}
        </h3>
        {canEdit ? (
          // Chỉ điện thoại cần nút camera riêng; máy tính dùng ô "Thêm ảnh" trong lưới.
          <Button
            className="md:hidden"
            icon={<CameraOutlined />}
            onClick={() => cameraRef.current?.click()}
          >
            Chụp ảnh
          </Button>
        ) : null}
      </div>

      {canEdit ? (
        <>
          <input
            ref={cameraRef}
            type="file"
            hidden
            accept={ACCEPT_ATTRIBUTE}
            capture="environment"
            onChange={(e) => {
              queue.add(e.target.files);
              e.target.value = "";
            }}
          />
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
        </>
      ) : null}

      <QueryState
        query={images}
        // Người sửa được: vùng thả ảnh CHÍNH là trạng thái rỗng (vẽ trong children).
        isEmpty={(data) => !canEdit && data.length === 0}
        skeleton={
          <div className={GRID}>
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton.Node
                key={i}
                active
                className="aspect-square h-auto w-full rounded-xl"
              />
            ))}
          </div>
        }
        emptyDescription="Chưa có ảnh cho mã này. Quản lý hoặc văn phòng sẽ bổ sung."
      >
        {(items) =>
          !hasAnything ? (
            <AddImageTile
              variant="empty"
              onPick={() => filesRef.current?.click()}
              onDropFiles={queue.add}
            />
          ) : (
            <Image.PreviewGroup>
              <div className={GRID}>
                {items.map((image) => (
                  <ImageTile
                    key={image.id}
                    image={image}
                    canEdit={canEdit}
                    pending={actions.pendingId === image.id}
                    onSetPrimary={actions.setPrimary}
                    onDelete={(id) => actions.remove(id, image.isPrimary)}
                  />
                ))}
                {queue.items.map((item) => (
                  <UploadTile
                    key={item.key}
                    item={item}
                    onRetry={queue.retry}
                    onRemove={queue.remove}
                  />
                ))}
                {canEdit ? (
                  <AddImageTile
                    onPick={() => filesRef.current?.click()}
                    onDropFiles={queue.add}
                  />
                ) : null}
              </div>
            </Image.PreviewGroup>
          )
        }
      </QueryState>
    </section>
  );
}
