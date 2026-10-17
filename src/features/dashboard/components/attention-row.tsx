"use client";

import Link from "next/link";

export type AttentionItem = {
  key: string;
  title: string;
  /** undefined = đang tải, null = lỗi. */
  count: number | null | undefined;
  description: string;
  dot: string;
  links: Array<{ label: string; href: string }>;
};

export const LOAD_FAILED_HINT = "Không tải được — bấm Làm mới";

function countLabel(count: number | null | undefined): string {
  if (count === undefined) return "…";
  if (count === null) return "—";
  return count.toLocaleString("vi-VN");
}

export function AttentionRow({ item }: { item: AttentionItem }) {
  const empty = item.count === 0;
  return (
    <div className="flex gap-3 border-t border-[#D6E6FB] py-3">
      <div
        title={item.count === null ? LOAD_FAILED_HINT : undefined}
        className={`w-[30px] shrink-0 text-[22px] leading-[1.1] font-extrabold tracking-[-0.03em] tabular-nums ${
          empty ? "text-trung-tinh-300" : ""
        }`}
      >
        {countLabel(item.count)}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[15.5px] font-bold">
          <span className={`size-1.5 shrink-0 rounded-full ${item.dot}`} />
          {item.title}
        </div>
        <div className="text-[14.5px] text-chu-phu">
          {empty ? "Không có" : item.description}
        </div>
        {empty ? null : (
          <div className="mt-1 flex flex-wrap gap-1.5">
            {item.links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-full bg-nen-the px-2.5 py-[5px] text-[14.5px] font-bold text-chu-chinh shadow-[0_0_0_1px_#E5E5E5]"
              >
                {link.label} →
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
