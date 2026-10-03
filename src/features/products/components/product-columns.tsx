"use client";

import { Button, Space, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";

import type { CodeDictionary } from "@/features/product-codes/lib/parse-product-code";

import { formatNumber } from "../lib/format";
import type { ProductForecast } from "../lib/product-expanded";
import type { ProductFilter, SortField } from "../schemas/filter.schema";
import type { Lookups, ProductRow } from "../types";
import { InlineEditCell } from "./inline-edit-cell";
import { forecastColumns, standardColumns } from "./product-extra-columns";
import { thumbnailColumn } from "./thumbnail-column";

function sortOrderFor(filter: ProductFilter, field: SortField) {
  if (filter.sortBy !== field) return null;
  return filter.sortDir === "desc" ? ("descend" as const) : ("ascend" as const);
}

type Params = {
  filter: ProductFilter;
  canEdit: boolean;
  lookups: Lookups | undefined;
  /** Bộ mã hóa — tra tên hãng / dòng / linh kiện từ mã lưu trong san_pham. */
  dictionary: CodeDictionary;
  onEdit: (id: string) => void;
  /** null = người xem không có quyền xem phân tích → không có hai cột dự báo. */
  forecasts: { byId: Map<string, ProductForecast>; loading: boolean } | null;
};

export function buildProductColumns({
  filter,
  canEdit,
  lookups,
  dictionary,
  onEdit,
  forecasts,
}: Params): TableColumnsType<ProductRow> {
  const categoryOptions = [
    { value: "", label: "(không nhóm)" },
    ...(lookups?.categories ?? []).map((item) => ({
      value: item.id,
      label: item.name,
    })),
  ];
  const unitOptions = (lookups?.units ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));
  const stageOptions = (lookups?.stages ?? []).map((item) => ({
    value: item.id,
    label: item.name,
  }));

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
      // Điện thoại: chọn + ảnh + mã (cố định trái) + "Sửa" (cố định phải) đã kín
      // 375px, cột Tên bị đẩy vào vùng cuộn ngang — người dùng chỉ thấy mã (GON-01).
      // Dưới md hiện tên ngay dưới mã; màn rộng vẫn dùng cột Tên riêng.
      render: (code: string, row) => (
        <>
          {/* Bấm dòng mở panel (PANEL-01) — mã không còn là link. */}
          <span className="font-mono text-brand-500">{code}</span>
          <span className="mt-0.5 line-clamp-2 text-xs text-chu-phu md:hidden">
            {row.name}
          </span>
        </>
      ),
    },
    {
      title: "Tên hàng",
      dataIndex: "name",
      key: "name",
      width: 280,
      ellipsis: true,
      sorter: true,
      sortOrder: sortOrderFor(filter, "name"),
      render: (name: string) => <Tooltip title={name}>{name}</Tooltip>,
    },
    ...standardColumns(dictionary),
    {
      title: "Nhóm hàng",
      dataIndex: "categoryName",
      width: 180,
      ellipsis: true,
      render: (name: string | null, row) => (
        <InlineEditCell
          productId={row.id}
          field="categoryId"
          enabled={canEdit}
          options={categoryOptions}
          label={name ?? <span className="text-gray-400">(không nhóm)</span>}
        />
      ),
    },
    {
      title: "ĐVT",
      dataIndex: "unitName",
      width: 110,
      render: (name: string, row) => (
        <InlineEditCell
          productId={row.id}
          field="unitId"
          enabled={canEdit}
          options={unitOptions}
          label={name}
        />
      ),
    },
    {
      title: "Xử lý",
      dataIndex: "stageName",
      width: 140,
      render: (name: string, row) => (
        <InlineEditCell
          productId={row.id}
          field="stageId"
          enabled={canEdit}
          options={stageOptions}
          label={name ? <Tag color={row.stageColor || undefined}>{name}</Tag> : "—"}
        />
      ),
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
    {
      title: "Trạng thái",
      key: "status",
      width: 190,
      render: (_: unknown, row: ProductRow) => (
        <Space size={4} wrap>
          {row.isActive ? null : <Tag>Ngừng KD</Tag>}
          {row.kind === "COMBO" ? <Tag color="purple">Combo</Tag> : null}
          {row.note ? (
            <Tooltip title={row.note}>
              <Tag color="orange">Thiếu quy chuẩn</Tag>
            </Tooltip>
          ) : null}
        </Space>
      ),
    },
    ...(canEdit
      ? [
          {
            title: "",
            key: "actions",
            width: 70,
            fixed: "right" as const,
            render: (_: unknown, row: ProductRow) => (
              <Button
                type="link"
                size="small"
                className="px-0"
                onClick={() => onEdit(row.id)}
              >
                Sửa
              </Button>
            ),
          },
        ]
      : []),
  ];
}
