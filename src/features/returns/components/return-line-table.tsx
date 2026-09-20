"use client";

import { App, InputNumber, Select, Table, Tooltip, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { useState } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { exceedsStock, type DocumentLine } from "@/features/documents/types";
import { SummaryRow } from "@/shared/components/summary-row";
import { explainError } from "@/shared/lib/errors";

import { useUpdateReturnLine } from "../hooks/useReturns";

function formatNumber(value: number | string | null): string {
  return value === null ? "" : Number(value).toLocaleString("vi-VN");
}

type Props = { documentId: string; lines: DocumentLine[]; editable: boolean };

/**
 * Bảng dòng phiếu trả — khuôn theo `issue-line-table.tsx` (stock-out) nhưng
 * bỏ hai thứ theo D-15:
 *
 * - KHÔNG `ProductSearchInput`/hàng thêm dòng — trả hàng không thêm mã ngoài
 *   chứng từ gốc, mã nào không có trên phiếu gốc thì không phải hàng của lần
 *   giao đó.
 * - KHÔNG nút xóa dòng — không trả dòng nào thì đặt số lượng về 0; xóa hẳn
 *   làm mất đối chiếu với chứng từ gốc (T-04-77).
 *
 * Số lượng cho phép bằng 0 nhưng không âm — validate tại chỗ, lỗi hiện dưới ô.
 */
export function ReturnLineTable({ documentId, lines, editable }: Props) {
  const { message } = App.useApp();
  const lookups = useLookups();
  const updateLine = useUpdateReturnLine(documentId);

  const [errors, setErrors] = useState<Record<string, string>>({});

  const warehouses = lookups.data?.warehouses ?? [];
  const hasMultipleWarehouses = warehouses.length > 1;

  async function editWarehouse(id: string, warehouseId: string) {
    const current = lines.find((line) => line.id === id);
    try {
      await updateLine.mutateAsync({
        id,
        values: { quantity: Number(current?.quantity ?? 0), warehouseId },
      });
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  async function editQuantity(id: string, raw: string, fallback: number) {
    const parsed = Number(raw.replace(/[^\d.-]/g, ""));
    if (!Number.isFinite(parsed) || parsed < 0) {
      setErrors((current) => ({ ...current, [id]: "Số lượng không được âm" }));
      return;
    }
    setErrors((current) => {
      const rest = { ...current };
      delete rest[id];
      return rest;
    });
    if (parsed === fallback) return;

    const current = lines.find((line) => line.id === id);
    try {
      await updateLine.mutateAsync({
        id,
        values: { quantity: parsed, warehouseId: current?.warehouseId ?? null },
      });
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  const columns: TableColumnsType<DocumentLine> = [
    {
      title: "Mã hàng",
      dataIndex: "productCode",
      key: "productCode",
      width: 150,
      render: (code: string) => <span className="font-mono">{code}</span>,
    },
    { title: "Tên hàng", dataIndex: "productName", key: "productName", ellipsis: true },
    { title: "ĐVT", dataIndex: "unitName", key: "unitName", width: 80 },
    ...(hasMultipleWarehouses
      ? [
          {
            title: "Kho",
            dataIndex: "warehouseName",
            key: "warehouseName",
            width: 130,
            render: (name: string, line: DocumentLine) =>
              editable ? (
                <Select
                  size="small"
                  className="w-full"
                  value={line.warehouseId}
                  options={warehouses.map((warehouse) => ({
                    value: warehouse.id,
                    label: warehouse.name,
                  }))}
                  onChange={(value) => void editWarehouse(line.id, value)}
                />
              ) : (
                name
              ),
          },
        ]
      : []),
    {
      title: "Số lượng trả",
      dataIndex: "quantity",
      key: "quantity",
      width: 150,
      align: "right",
      render: (value: number, line: DocumentLine) => {
        const over = exceedsStock(line);

        const input = editable ? (
          <div className="flex flex-col items-end gap-0.5">
            <InputNumber
              size="small"
              className="w-full"
              min={0}
              status={errors[line.id] ? "error" : undefined}
              defaultValue={Number(value)}
              onBlur={(event) => void editQuantity(line.id, event.target.value, Number(value))}
            />
            {errors[line.id] ? (
              <Typography.Text type="danger" className="text-xs">
                {errors[line.id]}
              </Typography.Text>
            ) : null}
          </div>
        ) : (
          formatNumber(value)
        );

        if (!over) return input;

        return (
          <Tooltip
            title={`Tồn kho ${line.warehouseName ?? ""} còn ${formatNumber(
              line.currentStock,
            )}, trả ${formatNumber(value)}`}
          >
            {input}
          </Tooltip>
        );
      },
    },
  ];

  const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);

  return (
    <div className="overflow-x-auto">
      <Table<DocumentLine>
        rowKey="id"
        size="small"
        columns={columns}
        dataSource={lines}
        pagination={false}
        scroll={{ x: 640 }}
        rowClassName={(line) => (exceedsStock(line) ? "bg-red-50" : "")}
        locale={{ emptyText: "Phiếu trả chưa có dòng nào." }}
        summary={() =>
          lines.length > 0 ? (
            <SummaryRow
              columns={columns}
              hasSelection={false}
              label={`Tổng cộng — ${lines.length} dòng`}
              totals={{ quantity: totalQuantity }}
            />
          ) : null
        }
      />
    </div>
  );
}
