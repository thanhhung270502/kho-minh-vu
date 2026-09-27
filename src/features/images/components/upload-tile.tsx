"use client";

import {
  CheckCircleFilled,
  CloseOutlined,
  ExclamationCircleFilled,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Progress, Tooltip } from "antd";

import type {
  UploadItem,
  UploadItemStatus,
} from "../hooks/useImageUploadQueue";

// Tiến độ theo BƯỚC, không phải phần trăm byte: phần lâu nhất là server gửi ảnh sang
// nơi lưu, trình duyệt không đo được — hiện đúng bước đang chạy thay vì số giả.
const STAGE: Record<
  Exclude<UploadItemStatus, "error">,
  { label: string; percent: number }
> = {
  waiting: { label: "Đang chờ", percent: 5 },
  compressing: { label: "Đang nén", percent: 35 },
  uploading: { label: "Đang tải lên", percent: 75 },
  done: { label: "Xong", percent: 100 },
};

/** Ô ảnh đang tải — hiện ngay ảnh xem trước từ máy, mờ đi cho tới khi lưu xong. */
export function UploadTile({
  item,
  onRetry,
  onRemove,
}: {
  item: UploadItem;
  onRetry: (key: string) => void;
  onRemove: (key: string) => void;
}) {
  const failed = item.status === "error";
  const stage = item.status === "error" ? null : STAGE[item.status];

  return (
    <div
      className={`relative aspect-square overflow-hidden rounded-xl border ${
        failed ? "border-red-300" : "border-gray-200"
      } bg-gray-50`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- object URL cục bộ, next/image không tối ưu được */}
      <img
        src={item.previewUrl}
        alt={item.name}
        className={`h-full w-full object-cover transition ${
          item.status === "done" ? "opacity-100" : "opacity-40 blur-[1px]"
        }`}
      />

      {stage ? (
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-white via-white/90 to-transparent px-2.5 pb-2 pt-6">
          <div className="flex items-center justify-between gap-1 text-xs text-gray-600">
            <span className="truncate">{stage.label}</span>
            {item.status === "done" ? (
              <CheckCircleFilled className="text-green-600" />
            ) : null}
          </div>
          <Progress
            percent={stage.percent}
            showInfo={false}
            size="small"
            status={item.status === "done" ? "success" : "active"}
            className="m-0"
          />
        </div>
      ) : null}

      {failed ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-white/85 p-2 text-center">
          <ExclamationCircleFilled className="text-lg text-red-500" />
          <Tooltip title={item.error?.action}>
            <span className="line-clamp-2 text-xs text-gray-700">
              {item.error?.title ?? "Không tải được ảnh"}
            </span>
          </Tooltip>
          <div className="flex gap-1">
            <Button
              size="small"
              icon={<ReloadOutlined />}
              onClick={() => onRetry(item.key)}
            >
              Thử lại
            </Button>
            <Button
              size="small"
              type="text"
              icon={<CloseOutlined />}
              aria-label="Bỏ ảnh này"
              onClick={() => onRemove(item.key)}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
