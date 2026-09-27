"use client";

import { App, Image, Skeleton } from "antd";

import { QueryState } from "@/shared/components/query-state";
import { explainError } from "@/shared/lib/errors";

import { ImageRequestError } from "../api/image.api";
import {
  useDeleteProductImage,
  useProductImages,
  useSetPrimaryImage,
} from "../hooks/useProductImages";
import { ImageTile } from "./image-tile";
import { ImageUploadButton } from "./image-upload-button";

function explainMutationError(error: unknown): { title: string; action: string } {
  if (error instanceof ImageRequestError) {
    return { title: error.title, action: error.action };
  }
  const explained = explainError(error);
  return { title: explained.title, action: explained.action };
}

/**
 * Mục "Hình ảnh" trong chi tiết mã hàng (D-15/D-16) — lưới thumbnail, bấm phóng
 * to tại chỗ và qua lại giữa ảnh của mã qua `Image.PreviewGroup`. Nút thêm ảnh
 * đặt NGOÀI `QueryState` để trạng thái rỗng vẫn thêm được ảnh ngay.
 */
export function ProductImageGallery({
  productId,
  canEdit,
}: {
  productId: string;
  canEdit: boolean;
}) {
  const { notification } = App.useApp();
  const images = useProductImages(productId);
  const setPrimary = useSetPrimaryImage(productId);
  const remove = useDeleteProductImage(productId);
  const busy = setPrimary.isPending || remove.isPending;

  function handleSetPrimary(imageId: string) {
    setPrimary.mutate(imageId, {
      onError: (error) => {
        const explained = explainMutationError(error);
        notification.error({ title: explained.title, description: explained.action });
      },
    });
  }

  function handleDelete(imageId: string) {
    remove.mutate(imageId, {
      onSuccess: ({ driveTrashed }) => {
        if (!driveTrashed) {
          notification.warning({
            title: "Đã xóa ảnh khỏi danh sách",
            description:
              "File trên Drive chưa chuyển được vào thùng rác. Báo quản trị kiểm tra Apps Script.",
          });
        }
      },
      onError: (error) => {
        const explained = explainMutationError(error);
        notification.error({ title: explained.title, description: explained.action });
      },
    });
  }

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-medium">Hình ảnh</h3>
        {canEdit ? <ImageUploadButton productId={productId} /> : null}
      </div>

      <QueryState
        query={images}
        skeleton={<Skeleton.Image active />}
        emptyDescription={
          canEdit
            ? "Chưa có ảnh — bấm Chụp ảnh hoặc Chọn ảnh để thêm."
            : "Chưa có ảnh cho mã này. Quản lý hoặc văn phòng sẽ bổ sung."
        }
      >
        {(items) => (
          <Image.PreviewGroup>
            <div className="flex flex-wrap gap-3">
              {items.map((image) => (
                <ImageTile
                  key={image.id}
                  image={image}
                  canEdit={canEdit}
                  busy={busy}
                  onSetPrimary={handleSetPrimary}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          </Image.PreviewGroup>
        )}
      </QueryState>
    </div>
  );
}
