"use client";

import { Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import type { SorterResult } from "antd/es/table/interface";

import { SummaryRow } from "@/shared/components/summary-row";

import {
  SORT_FIELDS,
  PAGE_SIZES,
  type ProductFilter,
  type SortField,
} from "../schemas/filter.schema";
import type { ProductRow } from "../types";

type Props = {
  columns: TableColumnsType<ProductRow>;
  rows: ProductRow[];
  total: number;
  filter: ProductFilter;
  hasSelection: boolean;
  selected: string[];
  onSelectionChange: (keys: string[]) => void;
  loading: boolean;
  onFilterChange: (filter: ProductFilter) => void;
};

/** Bảng chính của /danh-muc + hàng tổng cộng + ghi chú tồn 0 toàn trang. */
export function ProductTableBody({
  columns,
  rows,
  total,
  filter,
  hasSelection,
  selected,
  onSelectionChange,
  loading,
  onFilterChange,
}: Props) {
  const allStockIsZero =
    rows.length > 0 && rows.every((row) => Number(row.totalStock) === 0);

  function handleTableChange(
    pagination: { current?: number; pageSize?: number },
    sorter: SorterResult<ProductRow> | SorterResult<ProductRow>[],
  ) {
    const active = Array.isArray(sorter) ? sorter[0] : sorter;
    const sortField = active?.columnKey as SortField | undefined;
    const isSortable = sortField && SORT_FIELDS.includes(sortField);

    onFilterChange({
      ...filter,
      page: pagination.current ?? 1,
      pageSize: pagination.pageSize ?? filter.pageSize,
      sortBy: isSortable && active?.order ? sortField : null,
      sortDir: active?.order === "descend" ? "desc" : "asc",
    });
  }

  return (
    <>
      <Table<ProductRow>
        rowKey="id"
        size="small"
        sticky
        columns={columns}
        rowSelection={
          hasSelection
            ? {
                selectedRowKeys: selected,
                onChange: (keys) => onSelectionChange(keys as string[]),
                // Chọn ở trang 1, sang trang 2 chọn tiếp: antd v6 chỉ giữ được
                // khóa ngoài trang hiện tại khi bật cờ này.
                preserveSelectedRowKeys: true,
              }
            : undefined
        }
        dataSource={rows}
        loading={loading}
        scroll={{ x: 1100 }}
        onChange={(pagination, _filters, sorter) =>
          handleTableChange(pagination, sorter)
        }
        summary={() => (
          <SummaryRow
            columns={columns}
            hasSelection={hasSelection}
            label={`Tổng cộng — ${total.toLocaleString("vi-VN")} mã`}
            totals={{
              totalStock: rows.reduce(
                (sum, row) => sum + Number(row.totalStock ?? 0),
                0,
              ),
            }}
          />
        )}
        pagination={{
          current: filter.page,
          pageSize: filter.pageSize,
          total,
          showSizeChanger: true,
          pageSizeOptions: [...PAGE_SIZES],
          showTotal: (count) => `${count.toLocaleString("vi-VN")} mã`,
        }}
      />

      {allStockIsZero ? (
        <Typography.Text type="secondary" className="mt-2 block text-xs">
          Tồn đang bằng 0 cho mọi mã vì chưa có phiếu nhập — tồn thật được đặt khi kiểm kê
          đầu kỳ.
        </Typography.Text>
      ) : null}
    </>
  );
}
