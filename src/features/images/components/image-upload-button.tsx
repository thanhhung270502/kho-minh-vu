"use client";

import { CameraOutlined, PictureOutlined } from "@ant-design/icons";
import { App, Button, Spin, Typography } from "antd";
import { useRef, useState } from "react";

import { explainError } from "@/shared/lib/errors";

import { ImageRequestError } from "../api/image.api";
import { useUploadProductImage } from "../hooks/useProductImages";
import { ImageProcessingError } from "../lib/compress-image";
import { ACCEPT_ATTRIBUTE, checkPickedFile } from "../lib/image-rules";

type UploadStatus = "waiting" | "working" | "done" | "error";
type UploadItem = {
  key: string;
  name: string;
  status: UploadStatus;
  error?: { title: string; action: string };
};

function explainUploadError(error: unknown): { title: string; action: string } {
  if (error instanceof ImageProcessingError || error instanceof ImageRequestError) {
    return { title: error.title, action: error.action };
  }
  const explained = explainError(error);
  return { title: explained.title, action: explained.action };
}

/**
 * Chụp ảnh (camera điện thoại) / Chọn ảnh (nhiều file) — hàng đợi xử lý TUẦN TỰ
 * từng file để ảnh đầu tiên của mã chưa có ảnh thành ảnh chính đúng thứ tự người
 * chọn (D-20). Một file lỗi không dừng các file sau (09-10 Task 1).
 */
export function ImageUploadButton({ productId }: { productId: string }) {
  const { notification } = App.useApp();
  const upload = useUploadProductImage(productId);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [queue, setQueue] = useState<UploadItem[]>([]);
  const [processing, setProcessing] = useState(false);

  async function processFiles(files: FileList | null) {
    if (!files || files.length === 0) return;

    const items: UploadItem[] = Array.from(files).map((file, index) => ({
      key: `${Date.now()}-${index}-${file.name}`,
      name: file.name,
      status: "waiting",
    }));
    setQueue((prev) => [...prev, ...items]);
    setProcessing(true);

    let errorCount = 0;
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index];
      const item = items[index];
      setQueue((prev) =>
        prev.map((q) => (q.key === item.key ? { ...q, status: "working" } : q)),
      );

      const problem = checkPickedFile(file);
      if (problem) {
        errorCount += 1;
        setQueue((prev) =>
          prev.map((q) => (q.key === item.key ? { ...q, status: "error", error: problem } : q)),
        );
        continue;
      }

      try {
        await upload.mutateAsync(file);
        setQueue((prev) =>
          prev.map((q) => (q.key === item.key ? { ...q, status: "done" } : q)),
        );
      } catch (error) {
        errorCount += 1;
        const explained = explainUploadError(error);
        setQueue((prev) =>
          prev.map((q) =>
            q.key === item.key ? { ...q, status: "error", error: explained } : q,
          ),
        );
      }
    }

    setProcessing(false);
    if (errorCount > 0) {
      notification.warning({
        title: "Có ảnh chưa tải lên được",
        description: "Xem lý do từng ảnh bên dưới.",
      });
    }
  }

  const hasOnlyFinished =
    queue.length > 0 && queue.every((q) => q.status === "done" || q.status === "error");

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={cameraInputRef}
        type="file"
        hidden
        accept={ACCEPT_ATTRIBUTE}
        capture="environment"
        onChange={(event) => {
          void processFiles(event.target.files);
          event.target.value = "";
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        hidden
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          void processFiles(event.target.files);
          event.target.value = "";
        }}
      />

      <div className="flex flex-wrap gap-2">
        <Button
          icon={<CameraOutlined />}
          size="large"
          disabled={processing}
          onClick={() => cameraInputRef.current?.click()}
        >
          Chụp ảnh
        </Button>
        <Button
          icon={<PictureOutlined />}
          size="large"
          disabled={processing}
          onClick={() => fileInputRef.current?.click()}
        >
          Chọn ảnh
        </Button>
      </div>

      {queue.length > 0 ? (
        <div className="flex flex-col gap-1">
          {queue.map((item) => (
            <div key={item.key} className="flex items-center gap-2 text-sm">
              <span className="max-w-[220px] truncate">{item.name}</span>
              {item.status === "waiting" ? (
                <Typography.Text type="secondary">Chờ</Typography.Text>
              ) : null}
              {item.status === "working" ? (
                <span className="flex items-center gap-1">
                  <Spin size="small" /> Đang nén và tải lên…
                </span>
              ) : null}
              {item.status === "done" ? (
                <Typography.Text type="success">Xong</Typography.Text>
              ) : null}
              {item.status === "error" && item.error ? (
                <Typography.Text type="danger">
                  {item.error.title}. {item.error.action}
                </Typography.Text>
              ) : null}
            </div>
          ))}
          {hasOnlyFinished ? (
            <Button
              size="small"
              type="link"
              className="self-start"
              onClick={() =>
                setQueue((prev) => prev.filter((q) => q.status !== "done" && q.status !== "error"))
              }
            >
              Ẩn danh sách
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
