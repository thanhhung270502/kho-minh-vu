"use client";

import { Checkbox } from "antd";

import { StatusDot } from "@/shared/components/status-dot";

import { useOrderStatusCounts } from "../hooks/useOrders";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  type OrderStatus,
} from "../lib/order-status";
import type { OrderFilter } from "../schemas/order.schema";

/**
 * Tích chọn nhiều trạng thái. Mặc định tích mọi trạng thái trừ Đã hủy — đơn hủy ẩn,
 * tích vào mới hiện. Luôn giữ ít nhất một trạng thái (bỏ hết thì bảng trống vô nghĩa).
 */
export function OrderStatusFilter({
  filter,
  onChange,
}: {
  filter: OrderFilter;
  onChange: (statuses: OrderStatus[]) => void;
}) {
  const counts = useOrderStatusCounts(filter);
  const selected = filter.statuses;

  function countText(value: number | undefined): string {
    if (counts.isError) return "—";
    if (value === undefined) return "…";
    return value.toLocaleString("vi-VN");
  }

  const errorTitle = counts.isError
    ? "Không tải được số đếm — tải lại trang hoặc thử lại sau"
    : undefined;

  function toggle(status: OrderStatus) {
    const next = selected.includes(status)
      ? selected.filter((s) => s !== status)
      : ORDER_STATUSES.filter((s) => s === status || selected.includes(s));
    if (next.length > 0) onChange(next);
  }

  return (
    <div className="-mx-2 flex flex-col gap-0.5" role="group" aria-label="Trạng thái">
      {ORDER_STATUSES.map((status) => {
        const checked = selected.includes(status);
        // Cả dòng là nhãn của ô tích (Checkbox của antd tự bọc <label>) — bấm đâu cũng đổi.
        return (
          <Checkbox
            key={status}
            checked={checked}
            onChange={() => toggle(status)}
            className="m-0 flex h-9 w-full items-center rounded-[9px] px-2.5 text-[13.5px] hover:bg-nen-phu [&>span:last-child]:flex [&>span:last-child]:flex-1 [&>span:last-child]:items-center"
          >
            <StatusDot tone={ORDER_STATUS_TONES[status]}>{ORDER_STATUS_LABELS[status]}</StatusDot>
            <span className="ms-auto text-[12px] font-semibold text-trung-tinh-350 tabular-nums" title={errorTitle}>
              {countText(counts.data?.byStatus[status])}
            </span>
          </Checkbox>
        );
      })}
    </div>
  );
}
