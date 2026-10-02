"use client";

import { Card, Skeleton, Statistic, Typography, theme } from "antd";
import dayjs from "dayjs";

import { QueryState } from "@/shared/components/query-state";

import { compareSalesPace } from "../lib/dashboard-stats";
import { useSalesPace } from "../hooks/useDashboard";
import type { SalesPace } from "../types";

type StatItem = {
  title: string;
  today: number;
  yesterday: number;
};

function TrendLabel({ today, yesterday }: { today: number; yesterday: number }) {
  const { token } = theme.useToken();
  const { diff, trend } = compareSalesPace(today, yesterday);

  if (trend === "same") {
    return <Typography.Text type="secondary">Bằng hôm qua</Typography.Text>;
  }

  const color = trend === "up" ? token.colorSuccess : token.colorError;
  const sign = trend === "up" ? "▲" : "▼";
  const displayDiff = trend === "up" ? `+${diff}` : diff;

  return (
    <Typography.Text style={{ color }}>
      {sign} {displayDiff}
    </Typography.Text>
  );
}

function StatBlock({ item }: { item: StatItem }) {
  return (
    <div>
      <Statistic title={item.title} value={item.today} groupSeparator="." />
      <Typography.Text type="secondary" className="block text-[13px]">
        Hôm qua: {item.yesterday.toLocaleString("vi-VN")} · <TrendLabel today={item.today} yesterday={item.yesterday} />
      </Typography.Text>
    </div>
  );
}

function SalesPaceContent({ data }: { data: SalesPace }) {
  const items: StatItem[] = [
    {
      title: "Hóa đơn",
      today: data.today.documentCount,
      yesterday: data.yesterday.documentCount,
    },
    {
      title: "Dòng hàng",
      today: data.today.lineCount,
      yesterday: data.yesterday.lineCount,
    },
    {
      title: "Mã khác nhau",
      today: data.today.productCount,
      yesterday: data.yesterday.productCount,
    },
  ];

  return (
    <>
      <Typography.Text type="secondary" className="mb-3 block text-[13px]">
        Số chốt ngày {dayjs(data.today.date).format("DD/MM/YYYY")}
      </Typography.Text>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {items.map((item) => (
          <StatBlock key={item.title} item={item} />
        ))}
      </div>
      <Typography.Text type="secondary" className="mt-4 block text-[13px]">
        Chỉ tính hóa đơn đã ghi sổ, không tính phiếu hủy và đơn chưa xuất.
      </Typography.Text>
    </>
  );
}

/**
 * D-09: thẻ nhịp bán hôm nay so với hôm qua — số phiếu xuất, số dòng, số mã
 * khác nhau. Không biểu đồ. Chênh lệch là tuyệt đối, không phần trăm (D-09,
 * `compareSalesPace`) vì hôm qua bằng 0 không chia được. Ngày chốt nằm trong
 * nội dung (không phải `Card.extra`) để không phải đọc `query.data` bên
 * ngoài `QueryState` — Card không có gì để hiện trước khi có dữ liệu.
 */
export function SalesPaceCard() {
  const query = useSalesPace();

  return (
    <Card title="Nhịp bán hôm nay">
      <QueryState
        query={query}
        isEmpty={() => false}
        skeleton={<Skeleton active paragraph={{ rows: 2 }} />}
      >
        {(data) => <SalesPaceContent data={data} />}
      </QueryState>
    </Card>
  );
}
