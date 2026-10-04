"use client";

import { Button, InputNumber, Tooltip } from "antd";
import type { TableColumnsType } from "antd";

import { lineRecipientLabel } from "@/shared/lib/recipient";

import type { IssueLine } from "../types";

function formatNumber(value: number | string | null): string {
  return value === null ? "" : Number(value).toLocaleString("vi-VN");
}

type Params = {
  editable: boolean;
  showRecipient: boolean;
  staffCount: number;
  isOverStock: (line: IssueLine) => boolean;
  currentQuantity: (line: IssueLine) => number;
  onQuantityInput: (id: string, value: number | null, fallback: number) => void;
  onEditQuantity: (id: string, quantity: number) => void;
  onDelete: (id: string) => void;
};

/**
 * Cấu hình cột thuần, tách khỏi `issue-line-table.tsx` để file đó không vượt
 * 200 dòng (CLAUDE.md Bước 6) — không giữ state riêng, chỉ nhận callback.
 * Không có cột nào về tiền — phiếu xuất không mang giá bán. Không có cột Kho —
 * kho ẩn trên hóa đơn (04/10/2026).
 */
export function buildIssueLineColumns({
  editable,
  showRecipient,
  staffCount,
  isOverStock,
  currentQuantity,
  onQuantityInput,
  onEditQuantity,
  onDelete,
}: Params): TableColumnsType<IssueLine> {
  return [
    {
      title: "Mã hàng",
      dataIndex: "productCode",
      key: "productCode",
      width: 150,
      render: (code: string) => <span className="font-mono">{code}</span>,
    },
    {
      title: "Tên hàng",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
    },
    { title: "ĐVT", dataIndex: "unitName", key: "unitName", width: 80 },
    ...(showRecipient
      ? [
          {
            title: "Người nhận",
            key: "recipient",
            width: 160,
            render: (_: unknown, line: IssueLine) =>
              lineRecipientLabel(line.recipientName, staffCount),
          },
        ]
      : []),
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 130,
      align: "right",
      render: (value: number, line: IssueLine) => {
        const over = isOverStock(line);

        const input = editable ? (
          <InputNumber
            size="small"
            className="w-full"
            min={0}
            defaultValue={Number(value)}
            onChange={(next) => onQuantityInput(line.id, next, Number(value))}
            onBlur={(event) => {
              const parsed = Number(event.target.value.replace(/[^\d.-]/g, ""));
              if (Number.isFinite(parsed) && parsed !== Number(value)) {
                onEditQuantity(line.id, parsed);
              } else {
                onQuantityInput(line.id, null, Number(value));
              }
            }}
          />
        ) : (
          formatNumber(value)
        );

        // Luôn bọc Tooltip, chỉ đổi title: bọc/bỏ bọc theo `over` làm React dựng lại
        // InputNumber (không kiểm soát) ngay lúc số gõ đi qua ngưỡng tồn — mất focus
        // và mất số đang gõ (UAT 04 bài 6).
        return (
          <Tooltip
            title={
              over
                ? `Tồn kho ${line.warehouseName ?? ""} còn ${formatNumber(
                    line.currentStock,
                  )}, xuất ${formatNumber(currentQuantity(line))}`
                : undefined
            }
          >
            {input}
          </Tooltip>
        );
      },
    },
    ...(editable
      ? [
          {
            title: "",
            key: "delete",
            width: 60,
            align: "right" as const,
            render: (_: unknown, line: IssueLine) => (
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
