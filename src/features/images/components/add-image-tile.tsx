"use client";

import { CloudUploadOutlined, PlusOutlined } from "@ant-design/icons";
import { useState, type DragEvent } from "react";

/**
 * Ô "Thêm ảnh" viền nét đứt: bấm để chọn file, hoặc kéo thả ảnh từ máy tính vào.
 * `variant="empty"` là vùng thả lớn khi mã chưa có ảnh nào.
 */
export function AddImageTile({
  variant = "tile",
  onPick,
  onDropFiles,
}: {
  variant?: "tile" | "empty";
  onPick: () => void;
  onDropFiles: (files: FileList) => void;
}) {
  const [dragging, setDragging] = useState(false);

  const dragProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      setDragging(true);
    },
    onDragLeave: () => setDragging(false),
    onDrop: (event: DragEvent) => {
      event.preventDefault();
      setDragging(false);
      if (event.dataTransfer.files.length > 0)
        onDropFiles(event.dataTransfer.files);
    },
  };

  const tone = dragging
    ? "border-brand-500 bg-brand-25 text-brand-500"
    : "border-gray-300 bg-white text-gray-500 hover:border-brand-500 hover:text-brand-500";

  if (variant === "empty") {
    return (
      <button
        type="button"
        onClick={onPick}
        {...dragProps}
        className={`flex w-full flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-8 text-center transition-colors ${tone}`}
      >
        <CloudUploadOutlined className="text-3xl" />
        <span className="text-sm font-medium text-gray-800">
          Thêm ảnh cho mã hàng
        </span>
        <span className="text-xs text-gray-500">
          Bấm để chọn hoặc kéo thả ảnh vào đây · JPEG, PNG, WebP, GIF, HEIC…
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onPick}
      {...dragProps}
      aria-label="Thêm ảnh"
      className={`flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed transition-colors ${tone}`}
    >
      <PlusOutlined className="text-xl" />
      <span className="text-xs font-medium">Thêm ảnh</span>
    </button>
  );
}
