import { orderProgress } from "../lib/order-progress";

/** "Đã giao / đặt" dạng số — không vẽ thanh tiến độ. */
export function OrderProgress({ shipped, ordered }: { shipped: number; ordered: number }) {
  const { percent, label } = orderProgress(shipped, ordered);
  if (percent === null) return <span className="text-trung-tinh-250">—</span>;
  return (
    <span className="text-[14.5px] font-semibold tabular-nums" title={`Đã xuất ${label}`}>
      {label}
    </span>
  );
}
