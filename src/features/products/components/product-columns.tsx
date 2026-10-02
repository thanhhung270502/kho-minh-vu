"use client";

import { Button, Space, Tag, Tooltip, Typography } from "antd";
import dayjs from "dayjs";
import type { TableColumnsType } from "antd";

import type { ProductForecast } from "../lib/product-expanded";
import type { ProductFilter, SortField } from "../schemas/filter.schema";
import type { Lookups, ProductRow } from "../types";
import { InlineEditCell } from "./inline-edit-cell";
import { thumbnailColumn } from "./thumbnail-column";

/** Tiền và số lượng từ Postgres về có thể là string — chỉ dùng để HIỂN THỊ. */
export function formatNumber(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === "") return "—";
  return Number(value).toLocaleString("vi-VN");
}

function sortOrderFor(filter: ProductFilter, field: SortField) {
  if (filter.sortBy !== field) return null;
  return filter.sortDir === "desc" ? ("descend" as const) : ("ascend" as const);
}

type Params = {
  filter: ProductFilter;
  canEdit: boolean;
  lookups: Lookups | undefined;
  onEdit: (id: string) => void;
  /** null = người xem không có quyền xem phân tích → không có hai cột dự báo. */
  forecasts: { byId: Map<string, ProductForecast>; loading: boolean } | null;
};

export function buildProductColumns({
  filter,
  canEdit,
  lookups,
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
      title: "Công đoạn",
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
      render: (stock: number) =>
        Number(stock) === 0 ? (
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
          {row.unitNeedsReview ? (
            <Tooltip title="Ô ĐVT gốc KiotViet khác tên/đuôi mã — kiểm tra ĐVT và công đoạn">
              <Tag color="red">ĐVT mâu thuẫn</Tag>
            </Tooltip>
          ) : row.needsReview ? (
            <Tag color="orange">Cần rà</Tag>
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

/**
 * Khách đặt / Dự kiến hết hàng — cùng số với trang Phân tích (nhịp bán 30 ngày).
 * Số ghép ở trình duyệt nên KHÔNG sắp xếp được theo hai cột này.
 */
function forecastColumns(forecasts: {
  byId: Map<string, ProductForecast>;
  loading: boolean;
}): TableColumnsType<ProductRow> {
  const pending = <Typography.Text type="secondary">…</Typography.Text>;
  return [
    {
      title: "Khách đặt",
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
