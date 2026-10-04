import { orderProgress } from "../lib/order-progress";

export function OrderProgressBar({ shipped, ordered }: { shipped: number; ordered: number }) {
  const { percent, label } = orderProgress(shipped, ordered);
  if (percent === null) return <span className="text-trung-tinh-250">—</span>;
  return (
    <span className="flex items-center gap-2.5" title={`Đã xuất ${label}`}>
      <span className="h-1 flex-1 overflow-hidden rounded-full bg-[#F0F0F0]">
        <span className="block h-full bg-chu-chinh" style={{ width: `${percent}%` }} />
      </span>
      <span className="min-w-[56px] text-right text-[12.5px] font-semibold tabular-nums">{label}</span>
    </span>
  );
}
