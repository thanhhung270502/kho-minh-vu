"use client";

import { StatusDot } from "@/shared/components/status-dot";
import { cn } from "@/shared/utils/cn";

import { useOrderStatusCounts } from "../hooks/useOrders";
import {
  ORDER_STATUSES,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_TONES,
  type OrderStatus,
} from "../lib/order-status";
import type { OrderFilter } from "../schemas/order.schema";

export function OrderStatusFilter({
  filter,
  onSelect,
}: {
  filter: OrderFilter;
  onSelect: (status: OrderStatus | null) => void;
}) {
  const counts = useOrderStatusCounts(filter);

  function countText(value: number | undefined): string {
    if (counts.isError) return "—";
    if (value === undefined) return "…";
    return value.toLocaleString("vi-VN");
  }

  const errorTitle = counts.isError
    ? "Không tải được số đếm — tải lại trang hoặc thử lại sau"
    : undefined;

  const items: { status: OrderStatus | null; count: number | undefined }[] = [
    { status: null, count: counts.data?.total },
    ...ORDER_STATUSES.map((status) => ({
      status,
      count: counts.data?.byStatus[status],
    })),
  ];

  return (
    <div className="-mx-2 flex flex-col gap-0.5" role="radiogroup" aria-label="Trạng thái">
      {items.map(({ status, count }) => {
        const selected = filter.status === status;
        return (
          <button
            key={status ?? "all"}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onSelect(status)}
            className={cn(
              "flex h-9 w-full cursor-pointer items-center gap-2.5 rounded-[9px] border-0 px-2.5 text-left text-[13.5px]",
              selected ? "bg-nen-phu font-bold" : "bg-transparent hover:bg-nen-phu",
            )}
          >
            {status === null ? (
              <span>Tất cả</span>
            ) : (
              <StatusDot tone={ORDER_STATUS_TONES[status]}>{ORDER_STATUS_LABELS[status]}</StatusDot>
            )}
            <span
              className="ms-auto text-[12px] font-semibold text-trung-tinh-350 tabular-nums"
              title={errorTitle}
            >
              {countText(count)}
            </span>
          </button>
        );
      })}
    </div>
  );
}
