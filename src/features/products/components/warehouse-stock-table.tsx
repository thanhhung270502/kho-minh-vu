"use client";

import { InboxOutlined } from "@ant-design/icons";
import { Card, Table, Tooltip } from "antd";

import { QueryState } from "@/shared/components/query-state";

import { useProductCost, useStockByWarehouse } from "../hooks/useProducts";

const fmt = (n: number) => n.toLocaleString("vi-VN");

/** Bảng "Tồn theo kho" của trang chi tiết: Kho · Tồn · Tối thiểu · Giá trị (chỉ khi có quyền giá vốn). */
export function WarehouseStockTable({
  productId,
  unitName,
  minStock,
  canViewCost,
}: {
  productId: string;
  unitName: string | null;
  minStock: number;
  canViewCost: boolean;
}) {
  const stocks = useStockByWarehouse(productId);
  const cost = useProductCost(productId, canViewCost);

  const total = (stocks.data ?? []).reduce((sum, s) => sum + s.quantity, 0);

  return (
    <Card
      title="Tồn theo kho"
      extra={
        stocks.data ? (
          <span className="text-[13px] text-chu-phu">
            Tổng tồn: <b className="text-chu-chinh">{fmt(total)}</b>
            {unitName ? ` ${unitName}` : ""}
          </span>
        ) : null
      }
    >
      <QueryState
        query={stocks}
        emptyDescription={
          <span className="flex flex-col items-center gap-2">
            <InboxOutlined className="text-2xl text-trung-tinh-300" />
            Chưa có tồn — chưa có chứng từ nào cho mã này.
          </span>
        }
      >
        {(rows) => (
          <Table
            rowKey="warehouseId"
            size="small"
            pagination={false}
            dataSource={rows}
            scroll={{ x: "max-content" }}
            columns={[
              { title: "Kho", dataIndex: "warehouseName" },
              {
                title: "Tồn",
                dataIndex: "quantity",
                align: "right",
                render: (q: number) => (
                  <span className={q < 0 ? "text-nguy-hiem" : undefined}>{fmt(q)}</span>
                ),
              },
              {
                title: "Tối thiểu",
                align: "right",
                // Định mức hiện theo mã, chưa có theo kho — không thêm schema (CONTEXT).
                render: () => fmt(minStock),
              },
              ...(canViewCost
                ? [
                    {
                      title: "Giá trị",
                      align: "right" as const,
                      render: (_: unknown, row: { quantity: number }) => {
                        if (cost.isError) {
                          return (
                            <Tooltip title="Không tải được giá vốn">
                              <span>—</span>
                            </Tooltip>
                          );
                        }
                        if (cost.data == null) return "—";
                        return `${fmt(Math.max(row.quantity, 0) * cost.data)} đ`;
                      },
                    },
                  ]
                : []),
            ]}
          />
        )}
      </QueryState>
    </Card>
  );
}
