"use client";

import { Table, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { ProvisionalStockIssue } from "../api/provisional-stock.api";

const ISSUE_COLUMNS: ColumnsType<ProvisionalStockIssue> = [
  {
    title: "Mã hàng",
    dataIndex: "code",
    width: 200,
    // RPC trả mã rỗng cho dòng thiếu mã trong file.
    render: (value: string) =>
      value || <Typography.Text type="secondary">(trống)</Typography.Text>,
  },
  { title: "Lý do", dataIndex: "reason" },
];

// Danh mục KiotViet có hơn 3.000 mã, phần lớn tồn 0 và rơi vào "Bỏ qua" — phân
// trang để bảng không dựng hàng nghìn dòng một lúc.
const PAGE_SIZE = 20;

function IssueTable({
  title,
  rows,
}: {
  title: string;
  rows: ProvisionalStockIssue[];
}) {
  if (rows.length === 0) return null;

  return (
    <div>
      <Typography.Text strong>
        {title} ({rows.length.toLocaleString("vi-VN")})
      </Typography.Text>
      <Table
        className="mt-2"
        size="small"
        rowKey="key"
        columns={ISSUE_COLUMNS}
        dataSource={rows}
        pagination={
          rows.length > PAGE_SIZE
            ? { pageSize: PAGE_SIZE, showSizeChanger: false }
            : false
        }
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}

/**
 * Hai bảng con của kết quả kiểm: `loi` (dòng không nạp được) và `chi_tiet_bo_qua`
 * (mã đã có chứng từ thật hoặc tồn 0) — tách khỏi `provisional-stock-preview.tsx`
 * để file chính không vượt ~200 dòng.
 */
export function ProvisionalStockIssues({
  errors,
  skippedRows,
}: {
  errors: ProvisionalStockIssue[];
  skippedRows: ProvisionalStockIssue[];
}) {
  return (
    <>
      <IssueTable title="Lỗi — dòng không nạp được" rows={errors} />
      <IssueTable title="Bỏ qua" rows={skippedRows} />
    </>
  );
}
