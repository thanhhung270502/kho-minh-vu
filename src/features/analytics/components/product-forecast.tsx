"use client";

import { Descriptions, Skeleton, Typography } from "antd";
import dayjs from "dayjs";
import { useSearchParams } from "next/navigation";

import { readSelectedId } from "@/shared/lib/selected-id";

import { useAnalysisRow, useAnalysisSettings } from "../hooks/useAnalytics";
import { StatusTag, formatQty } from "./status-tag";

const PERIOD = 30;

/**
 * Khách đặt + dự kiến hết hàng trong panel mã hàng ở /danh-muc. Route chỉ ghép
 * vào khi người xem có quyền "view-analysis" — thủ kho không thấy hai trường
 * này (RPC cũng chặn). Đọc mã đang chọn từ `?chon=`: route là Server Component,
 * không truyền được hàm render theo id xuống.
 */
export function ProductForecast() {
  const productId = readSelectedId(useSearchParams()) ?? "";
  const row = useAnalysisRow(PERIOD, productId);
  const settings = useAnalysisSettings();

  if (row.isPending) return <Skeleton active paragraph={{ rows: 2 }} title={false} />;
  if (row.isError) {
    return (
      <Typography.Text type="secondary" className="text-xs">
        Không tải được dự báo.{" "}
        <Typography.Link onClick={() => void row.refetch()}>Thử lại</Typography.Link>
      </Typography.Text>
    );
  }

  const data = row.data;
  return (
    <Descriptions
      size="small"
      column={1}
      items={[
        { key: "ordered", label: "Khách đặt", children: data ? formatQty(data.customerOrdered) : "—" },
        {
          key: "stockout",
          label: "Dự kiến hết hàng",
          children: !data ? (
            "—"
          ) : data.avgDailySales === null ? (
            <span className="text-chu-phu">Không bán trong {PERIOD} ngày</span>
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              {data.stockoutDate ? dayjs(data.stockoutDate).format("DD/MM/YYYY") : "—"}
              <span className="text-xs text-chu-phu">còn {formatQty(data.daysOfCover, 0)} ngày</span>
              {settings.data ? <StatusTag row={data} settings={settings.data} /> : null}
            </span>
          ),
        },
      ]}
    />
  );
}
