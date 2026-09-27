import { App } from "antd";
import { useState } from "react";

import { explainError } from "@/shared/lib/errors";

import { ImageRequestError } from "../api/image.api";
import { useDeleteProductImage, useSetPrimaryImage } from "./useProductImages";

function explainMutationError(error: unknown): {
  title: string;
  action: string;
} {
  if (error instanceof ImageRequestError) {
    return { title: error.title, action: error.action };
  }
  const explained = explainError(error);
  return { title: explained.title, action: explained.action };
}

/** Đặt ảnh chính / xóa ảnh kèm hộp xác nhận và thông báo lỗi đọc được. */
export function useImageActions(productId: string) {
  const { notification, modal } = App.useApp();
  const setPrimaryMutation = useSetPrimaryImage(productId);
  const removeMutation = useDeleteProductImage(productId);
  // Ô nào đang chờ server — chỉ ô đó hiện vòng xoay, các ô khác vẫn thao tác được.
  const [pendingId, setPendingId] = useState<string | null>(null);

  const showError = (error: unknown) => {
    const explained = explainMutationError(error);
    notification.error({
      title: explained.title,
      description: explained.action,
    });
  };

  function setPrimary(imageId: string) {
    setPendingId(imageId);
    setPrimaryMutation.mutate(imageId, {
      onError: showError,
      onSettled: () => setPendingId(null),
    });
  }

  function remove(imageId: string, isPrimary: boolean) {
    modal.confirm({
      title: "Xóa ảnh này?",
      content: isPrimary
        ? "Đây là ảnh chính — ảnh kế tiếp sẽ tự lên thay."
        : undefined,
      okText: "Xóa ảnh",
      okButtonProps: { danger: true },
      cancelText: "Không",
      onOk: () => {
        setPendingId(imageId);
        removeMutation.mutate(imageId, {
          onSuccess: ({ driveTrashed }) => {
            if (!driveTrashed) {
              notification.warning({
                title: "Đã xóa ảnh khỏi danh sách",
                description:
                  "File trên Drive chưa vào được thùng rác. Báo quản trị kiểm tra Apps Script.",
              });
            }
          },
          onError: showError,
          onSettled: () => setPendingId(null),
        });
      },
    });
  }

  return { pendingId, setPrimary, remove };
}
