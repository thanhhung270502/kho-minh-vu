"use client";

import { Button, InputNumber, Tag, Tooltip } from "antd";
import type { TableColumnsType } from "antd";

import { StaffSelect } from "@/shared/components/staff-select";
import {
  COMMON_GOODS_LABEL,
  lineRecipientLabel,
  type StaffRef,
} from "@/shared/lib/recipient";

import type { OrderLine } from "../types";

function formatNumber(value: number | string | null): string {
  return value === null ? "" : Number(value).toLocaleString("vi-VN");
}

type Params = {
  editable: boolean;
  /** Chỉ hiện hai cột Đã xuất/Còn lại khi đơn đã có phiếu xuất. */
  showProgress: boolean;
  /** Chỉ hiện cột Người nhận khi đơn đa người nhận hoặc đã có dòng được gán. */
  showRecipient: boolean;
  staffCount: number;
  /** Nhân viên của đơn + người nhận ở các dòng, để người ngừng dùng vẫn hiện tên. */
  extraStaff: StaffRef[];
  onEditRecipient: (
    id: string,
    recipientId: string | null,
    name: string | undefined,
  ) => void;
  onEditQuantity: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
};

/**
 * Cấu hình cột thuần, tách khỏi `order-line-table.tsx` để file đó không vượt
 * 200 dòng (CLAUDE.md Bước 6) — không giữ state riêng, chỉ nhận callback.
 */
export function buildOrderLineColumns({
  editable,
  showProgress,
  showRecipient,
  staffCount,
  extraStaff,
  onEditRecipient,
  onEditQuantity,
  onDelete,
}: Params): TableColumnsType<OrderLine> {
  return [
    {
      title: "Mã hàng",
      dataIndex: "productCode",
      key: "productCode",
      width: 160,
      render: (code: string) => <span className="font-mono">{code}</span>,
    },
    {
      title: "Tên hàng",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
    },
    { title: "ĐVT", dataIndex: "unitName", key: "unitName", width: 90 },
    ...(showRecipient
      ? [
          {
            title: "Người nhận",
            key: "recipient",
            width: 190,
            render: (_: unknown, line: OrderLine) =>
              editable ? (
                <StaffSelect
                  size="small"
                  placeholder={COMMON_GOODS_LABEL}
                  value={line.recipientId ?? undefined}
                  extraOptions={extraStaff}
                  onChange={(id, name) => onEditRecipient(line.id, id ?? null, name)}
                />
              ) : (
                lineRecipientLabel(line.recipientName, staffCount)
              ),
          },
        ]
      : []),
    {
      title: "Số lượng đặt",
      dataIndex: "orderedQuantity",
      key: "orderedQuantity",
      width: 130,
      align: "right",
      render: (value: number, line: OrderLine) =>
        editable ? (
          <InputNumber
            size="small"
            className="w-full"
            min={0}
            defaultValue={Number(value)}
            onBlur={(event) => {
              const parsed = Number(event.target.value.replace(/[^\d.-]/g, ""));
              if (
                Number.isFinite(parsed) &&
                parsed > 0 &&
                parsed !== Number(value)
              ) {
                onEditQuantity(line.id, parsed);
              }
            }}
          />
        ) : (
          formatNumber(value)
        ),
    },
    ...(showProgress
      ? [
          {
            title: "Đã xuất",
            dataIndex: "shippedQuantity",
            key: "shippedQuantity",
            width: 110,
            align: "right" as const,
            render: (value: number) => formatNumber(value),
          },
          {
            title: "Còn lại",
            key: "remainingQuantity",
            dataIndex: "remainingQuantity",
            width: 120,
            align: "right" as const,
            // Tính khi render, KHÔNG giữ state (D-04) — remainingQuantity đã
            // tính sẵn trong toOrderLine của plan 04-06.
            render: (_: unknown, line: OrderLine) =>
              line.remainingQuantity === 0 && line.shippedQuantity > 0 ? (
                <Tag color="green">Đã giao đủ</Tag>
              ) : (
                formatNumber(line.remainingQuantity)
              ),
          },
        ]
      : []),
    ...(editable
      ? [
          {
            title: "",
            key: "delete",
            width: 60,
            align: "right" as const,
            // Dòng đã có phiếu xuất không xóa được — xóa đi thì
            // so_luong_da_xuat treo không tham chiếu (T-04-46).
            render: (_: unknown, line: OrderLine) =>
              line.shippedQuantity > 0 ? (
                <Tooltip title="Dòng đã có hóa đơn, không xóa được">
                  <Button type="link" size="small" danger disabled className="px-0">
                    Xóa
                  </Button>
                </Tooltip>
              ) : (
                <Button
                  type="link"
                  size="small"
                  danger
                  className="px-0"
                  onClick={() => onDelete(line.id)}
                >
                  Xóa
                </Button>
              ),
          },
        ]
      : []),
  ];
}
