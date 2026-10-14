"use client";

import { Checkbox } from "antd";

import { StatusDot } from "@/shared/components/status-dot";

import { DOC_STATUSES, toggleDocStatus } from "../lib/status-filter";
import { DOC_STATUS_TONES, type DocStatus, type DocStatusCounts } from "../types";

/**
 * Tích chọn nhiều trạng thái, khuôn `OrderStatusFilter` của Đơn đặt. Mỗi màn
 * truyền nhãn riêng (Hóa đơn "Đã duyệt", Nhập hàng "Đã nhập") và số đếm của mình.
 * Luôn giữ ít nhất một ô tích (bỏ hết thì bảng trống vô nghĩa).
 */
export function DocStatusFilter({
  selected,
  onChange,
  labels,
  counts,
  countsFailed,
}: {
  selected: DocStatus[];
  onChange: (statuses: DocStatus[]) => void;
  labels: Record<DocStatus, string>;
  counts: DocStatusCounts | undefined;
  countsFailed: boolean;
}) {
  function countText(status: DocStatus): string {
    if (countsFailed) return "—";
    if (counts === undefined) return "…";
    return counts[status].toLocaleString("vi-VN");
  }

  const errorTitle = countsFailed
    ? "Không tải được số đếm — tải lại trang hoặc thử lại sau"
    : undefined;

  return (
    <div className="-mx-2 flex flex-col gap-0.5" role="group" aria-label="Trạng thái">
      {DOC_STATUSES.map((status) => (
        // Cả dòng là nhãn của ô tích (Checkbox của antd tự bọc <label>) — bấm đâu cũng đổi.
        <Checkbox
          key={status}
          checked={selected.includes(status)}
          onChange={() => {
            const next = toggleDocStatus(selected, status);
            if (next) onChange(next);
          }}
          className="m-0 flex h-9 w-full items-center rounded-[9px] px-2.5 text-[15.5px] hover:bg-nen-phu [&>span:last-child]:flex [&>span:last-child]:flex-1 [&>span:last-child]:items-center"
        >
          <StatusDot tone={DOC_STATUS_TONES[status]}>{labels[status]}</StatusDot>
          <span className="ms-auto text-[14px] font-semibold text-trung-tinh-350 tabular-nums" title={errorTitle}>
            {countText(status)}
          </span>
        </Checkbox>
      ))}
    </div>
  );
}
