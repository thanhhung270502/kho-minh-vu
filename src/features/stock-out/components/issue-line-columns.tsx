"use client";

import { Button, InputNumber, Select, Tooltip } from "antd";
import type { TableColumnsType } from "antd";

import type { IssueLine } from "../types";

function formatNumber(value: number | string | null): string {
  return value === null ? "" : Number(value).toLocaleString("vi-VN");
}

type Warehouse = { id: string; name: string };

type Params = {
  editable: boolean;
  hasMultipleWarehouses: boolean;
  warehouses: Warehouse[];
  isOverStock: (line: IssueLine) => boolean;
  currentQuantity: (line: IssueLine) => number;
  onQuantityInput: (id: string, value: number | null, fallback: number) => void;
  onEditQuantity: (id: string, quantity: number) => void;
  onEditWarehouse: (id: string, warehouseId: string) => void;
  onDelete: (id: string) => void;
};

/**
 * Cấu hình cột thuần, tách khỏi `issue-line-table.tsx` để file đó không vượt
 * 200 dòng (CLAUDE.md Bước 6) — không giữ state riêng, chỉ nhận callback.
 * Không có cột nào về tiền — phiếu xuất không mang giá bán.
 */
export function buildIssueLineColumns({
  editable,
  hasMultipleWarehouses,
  warehouses,
  isOverStock,
  currentQuantity,
  onQuantityInput,
  onEditQuantity,
  onEditWarehouse,
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
    ...(hasMultipleWarehouses
      ? [
          {
            title: "Kho",
            dataIndex: "warehouseName",
            key: "warehouseName",
            width: 130,
            render: (name: string, line: IssueLine) =>
              editable ? (
                <Select
                  size="small"
                  className="w-full"
                  value={line.warehouseId}
                  options={warehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: warehouse.name,
                  }))}
                  onChange={(value) => onEditWarehouse(line.id, value)}
                />
              ) : (
                name
              ),
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
