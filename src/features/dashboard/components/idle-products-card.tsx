"use client";

import { Tooltip } from "antd";
import Link from "next/link";

import { QueryState } from "@/shared/components/query-state";

import { useIdleProducts } from "../hooks/useDashboard";

export function IdleProductsCard() {
  const query = useIdleProducts();

  return (
    <section className="rounded-[18px] border border-vien px-5 py-[18px]">
      <div className="flex items-baseline justify-between pb-2">
        <span className="text-[14.5px] font-extrabold">Không luân chuyển</span>
        <Tooltip title="Tính từ lần phát sinh sổ kho gần nhất của mã — nạp tồn hay kiểm kê cũng tính là phát sinh">
          <span className="text-[12px] text-trung-tinh-350">&gt; 30 ngày</span>
        </Tooltip>
      </div>
      <QueryState query={query} emptyDescription="Không có mã nào đứng yên quá 30 ngày.">
        {(products) =>
          products.map((p) => (
            <Link
              key={p.key}
              href={`/danh-muc/${p.productId}`}
              className="flex justify-between gap-2.5 border-t border-trung-tinh-75 py-[9px]"
            >
              <span className="flex min-w-0 flex-col">
                <span className="font-mono text-[12px] font-medium">{p.code}</span>
                <span className="truncate text-[12.5px] text-chu-phu">{p.name}</span>
              </span>
              <span className="shrink-0 text-[12.5px] font-bold">
                {p.idleDays.toLocaleString("vi-VN")} ngày
              </span>
            </Link>
          ))
        }
      </QueryState>
    </section>
  );
}
