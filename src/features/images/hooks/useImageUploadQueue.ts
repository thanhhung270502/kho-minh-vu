import { useEffect, useRef, useState } from "react";

import { explainError } from "@/shared/lib/errors";

import { ImageRequestError } from "../api/image.api";
import { ImageProcessingError } from "../lib/compress-image";
import { checkPickedFile } from "../lib/image-rules";
import { useUploadProductImage, type UploadStage } from "./useProductImages";

export type UploadItemStatus = "waiting" | UploadStage | "done" | "error";

export type UploadItem = {
  key: string;
  name: string;
  /** Object URL của file gốc — hiện ngay trong lưới trước khi server trả ảnh. */
  previewUrl: string;
  status: UploadItemStatus;
  error?: { title: string; action: string };
};

function explainUploadError(error: unknown): { title: string; action: string } {
  if (
    error instanceof ImageProcessingError ||
    error instanceof ImageRequestError
  ) {
    return { title: error.title, action: error.action };
  }
  const explained = explainError(error);
  return { title: explained.title, action: explained.action };
}

// Ô "xong" lưu lại chốc lát cho người dùng thấy dấu tích, rồi nhường chỗ cho ảnh thật.
const DONE_LINGER_MS = 900;

/**
 * Hàng đợi tải ảnh — chạy TUẦN TỰ để ảnh đầu tiên của mã chưa có ảnh thành ảnh chính
 * đúng thứ tự người chọn (D-20). Một file lỗi không dừng file sau; file lỗi giữ lại để
 * "Thử lại" mà không phải chọn lại.
 */
export function useImageUploadQueue(productId: string) {
  const upload = useUploadProductImage(productId);
  const [items, setItems] = useState<UploadItem[]>([]);
  const files = useRef(new Map<string, File>());
  const running = useRef(false);
  const pending = useRef<string[]>([]);

  const patch = (key: string, next: Partial<UploadItem>) =>
    setItems((prev) =>
      prev.map((item) => (item.key === key ? { ...item, ...next } : item)),
    );

  const drop = (key: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.key === key);
      if (item) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((i) => i.key !== key);
    });
    files.current.delete(key);
  };

  async function runQueue() {
    if (running.current) return;
    running.current = true;
    while (pending.current.length > 0) {
      const key = pending.current.shift();
      const file = key ? files.current.get(key) : undefined;
      if (!key || !file) continue;

      const problem = checkPickedFile(file);
      if (problem) {
        patch(key, { status: "error", error: problem });
        continue;
      }

      try {
        await upload.mutateAsync({
          file,
          onStage: (stage) => patch(key, { status: stage }),
        });
        patch(key, { status: "done" });
        setTimeout(() => drop(key), DONE_LINGER_MS);
      } catch (error) {
        patch(key, { status: "error", error: explainUploadError(error) });
      }
    }
    running.current = false;
  }

  function add(list: FileList | File[] | null) {
    if (!list || list.length === 0) return;
    const added: UploadItem[] = Array.from(list).map((file, index) => {
      const key = `${Date.now()}-${index}-${file.name}`;
      files.current.set(key, file);
      pending.current.push(key);
      return {
        key,
        name: file.name,
        previewUrl: URL.createObjectURL(file),
        status: "waiting",
      };
    });
    setItems((prev) => [...prev, ...added]);
    void runQueue();
  }

  function retry(key: string) {
    patch(key, { status: "waiting", error: undefined });
    pending.current.push(key);
    void runQueue();
  }

  // Rời màn hình thì trả bộ nhớ của các ảnh xem trước.
  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  useEffect(
    () => () =>
      itemsRef.current.forEach((i) => URL.revokeObjectURL(i.previewUrl)),
    [],
  );

  return {
    items,
    add,
    retry,
    remove: drop,
    busy: items.some((i) => i.status !== "done" && i.status !== "error"),
  };
}
