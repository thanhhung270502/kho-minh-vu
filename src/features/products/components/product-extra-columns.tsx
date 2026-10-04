"use client";

import { Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import type { TableColumnsType } from "antd";

import type { CodeDictionary } from "@/features/product-codes/lib/parse-product-code";

import { formatNumber } from "../lib/format";
import type { ProductForecast } from "../lib/product-expanded";
import { standardNames } from "../lib/standard-fields";
import type { ProductRow } from "../types";

/**
 * Hãng xe / Dòng xe / Linh kiện — bảng lưu MÃ, tên tra bộ mã hóa. Mã không còn
 * trong bộ mã hóa thì hiện chính mã (xám) để người dùng thấy và sửa.
 */
export function standardColumns(dictionary: CodeDictionary): TableColumnsType<ProductRow> {
  // Bộ mã hóa chưa tải xong → hiện mã, không báo "không có trong bộ mã hóa" oan.
  const loaded = dictionary.brands.size > 0;
  const cell = (name: string | null, code: string | null) => {
    if (name) return <Tooltip title={name}>{name}</Tooltip>;
    if (!code) return <span className="text-gray-400">—</span>;
    return loaded ? (
      <Tooltip title="Mã không có trong bộ mã hóa">
        <span className="font-mono text-gray-400">{code}</span>
      </Tooltip>
    ) : (
      <span className="font-mono">{code}</span>
    );
  };
  const names = (row: ProductRow) => standardNames(dictionary, row);
  return [
    {
      title: "Hãng xe",
      key: "brand",
      width: 110,
      ellipsis: true,
      render: (_: unknown, row) => cell(names(row).brandName, row.brandCode),
    },
    {
      title: "Dòng xe",
      key: "model",
      width: 130,
      ellipsis: true,
      render: (_: unknown, row) => cell(names(row).modelName, row.modelCode),
    },
    {
      title: "Linh kiện",
      key: "part",
      width: 150,
      ellipsis: true,
      render: (_: unknown, row) => cell(names(row).partName, row.partCode),
    },
  ];
}

/**
 * Đơn đặt / Dự kiến hết hàng — cùng số với trang Phân tích (nhịp bán 30 ngày).
 * Số ghép ở trình duyệt nên KHÔNG sắp xếp được theo hai cột này.
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
  ];
}
