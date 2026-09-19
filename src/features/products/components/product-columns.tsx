"use client";

import { Button, Space, Tag, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";

import type { ProductFilter, SortField } from "../schemas/filter.schema";
import type { Lookups, ProductRow } from "../types";
import { InlineEditCell } from "./inline-edit-cell";

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
  canViewCost: boolean;
  canEdit: boolean;
  lookups: Lookups | undefined;
  onEdit: (id: string) => void;
};

export function buildProductColumns({
  filter,
  canViewCost,
  canEdit,
  lookups,
  onEdit,
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
    {
      title: "Mã hàng",
      dataIndex: "code",
      key: "code",
      width: 170,
      fixed: "left",
      sorter: true,
      sortOrder: sortOrderFor(filter, "code"),
      render: (code: string, row) => (
        <Link href={`/danh-muc/${row.id}`} className="font-mono">
          {code}
        </Link>
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
    {
      title: "Giá bán",
      dataIndex: "salePrice",
      width: 110,
      align: "right",
      className: "tabular-nums",
      render: formatNumber,
    },
    ...(canViewCost
      ? [
          {
            title: "Giá vốn",
            dataIndex: "costPrice",
            width: 110,
            align: "right" as const,
            className: "tabular-nums",
            render: formatNumber,
          },
        ]
      : []),
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
