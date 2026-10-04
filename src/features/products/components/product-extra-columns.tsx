"use client";

import { Typography } from "antd";
import dayjs from "dayjs";
import type { TableColumnsType } from "antd";

import { formatNumber } from "../lib/format";
import type { ProductForecast } from "../lib/product-expanded";
import type { ProductRow } from "../types";

/**
 * Đơn đặt / Dự kiến hết hàng / Cần đặt — cùng số với trang Phân tích (nhịp bán
 * 30 ngày). Số ghép ở trình duyệt nên KHÔNG sắp xếp được theo các cột này.
 */
export function forecastColumns(forecasts: {
  byId: Map<string, ProductForecast>;
  loading: boolean;
}): TableColumnsType<ProductRow> {
  const pending = <Typography.Text type="secondary">…</Typography.Text>;
  return [
    {
      title: "Đơn đặt",
      key: "customerOrdered",
      width: 100,
      align: "right",
      className: "tabular-nums",
      render: (_: unknown, row: ProductRow) => {
        const f = forecasts.byId.get(row.id);
        if (!f) return forecasts.loading ? pending : "—";
        return f.customerOrdered === 0 ? <Typography.Text type="secondary">0</Typography.Text> : formatNumber(f.customerOrdered);
      },
    },
    {
      title: "Dự kiến hết hàng",
      key: "stockoutDate",
      width: 140,
      render: (_: unknown, row: ProductRow) => {
        const f = forecasts.byId.get(row.id);
        if (!f) return forecasts.loading ? pending : "—";
        if (!f.selling) return <Typography.Text type="secondary">Không bán</Typography.Text>;
        return f.stockoutDate ? dayjs(f.stockoutDate).format("DD/MM/YYYY") : "—";
      },
    },
    {
      title: "Cần đặt",
      key: "toOrder",
      width: 100,
      align: "right",
      className: "tabular-nums",
      render: (_: unknown, row: ProductRow) => {
        const f = forecasts.byId.get(row.id);
        if (!f) return forecasts.loading ? pending : "—";
        return f.toOrder === 0 ? <Typography.Text type="secondary">0</Typography.Text> : <span className="font-semibold">{formatNumber(f.toOrder)}</span>;
      },
    },
  ];
}
