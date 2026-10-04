"use client";

import { Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";

import { formatNumber } from "../lib/format";
import type { ProductForecast } from "../lib/product-expanded";
import type { ProductFilter, SortField } from "../schemas/filter.schema";
import type { ProductRow } from "../types";
import { forecastColumns } from "./product-extra-columns";
import { thumbnailColumn } from "./thumbnail-column";

function sortOrderFor(filter: ProductFilter, field: SortField) {
  if (filter.sortBy !== field) return null;
  return filter.sortDir === "desc" ? ("descend" as const) : ("ascend" as const);
}

type Params = {
  filter: ProductFilter;
  /** null = người xem không có quyền xem phân tích → không có cột dự báo. */
  forecasts: { byId: Map<string, ProductForecast>; loading: boolean } | null;
};

/**
 * Bảng danh mục gọn: ảnh, mã, tên, tồn + Đơn đặt / Dự kiến hết hàng / Cần đặt.
 * Hãng/dòng/linh kiện/xử lý, nhóm hàng… xem ở dòng mở rộng; sửa bằng nút
 * "Chỉnh sửa" trong dòng mở rộng (không còn cột "Sửa").
 */
export function buildProductColumns({ filter, forecasts }: Params): TableColumnsType<ProductRow> {
  return [
    thumbnailColumn(),
    {
      title: "Mã hàng",
      dataIndex: "code",
      key: "code",
      width: 170,
      fixed: "left",
      sorter: true,
      sortOrder: sortOrderFor(filter, "code"),
      // Điện thoại: cột Tên bị đẩy vào vùng cuộn ngang (GON-01) — dưới md hiện
      // tên ngay dưới mã; màn rộng vẫn dùng cột Tên riêng.
      render: (code: string, row) => (
        <>
          {/* Bấm dòng mở panel (PANEL-01) — mã không còn là link. */}
          <span className="font-mono text-brand-500">{code}</span>
          <span className="mt-0.5 line-clamp-2 text-xs text-chu-phu md:hidden">{row.name}</span>
        </>
      ),
    },
    {
      title: "Tên hàng",
      dataIndex: "name",
      key: "name",
      width: 320,
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderFor(filter, "name"),
      render: (name: string) => <Tooltip title={name}>{name}</Tooltip>,
    },
    {
      title: "Tồn",
      dataIndex: "totalStock",
      key: "totalStock",
      width: 100,
      align: "right",
      className: "tabular-nums",
      sorter: true,
      sortOrder: sortOrderFor(filter, "totalStock"),
      render: (stock: number, row: ProductRow) =>
        row.kind === "COMBO" ? (
          <Tooltip title="Combo không có tồn riêng — tồn nằm ở các mã thành phần">
            <Typography.Text type="secondary">Combo</Typography.Text>
          </Tooltip>
        ) : Number(stock) === 0 ? (
          <Typography.Text type="secondary">0</Typography.Text>
        ) : (
          formatNumber(stock)
        ),
    },
    ...(forecasts ? forecastColumns(forecasts) : []),
  ];
}
