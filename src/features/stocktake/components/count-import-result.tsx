"use client";

import { Statistic, Table, Typography, theme } from "antd";
import type { ColumnsType } from "antd/es/table";

import type { CountImportIssue, CountImportResult } from "../api/count-import.api";

const ISSUE_COLUMNS: ColumnsType<CountImportIssue> = [
  { title: "Mã hàng", dataIndex: "code", width: 160 },
  { title: "Lý do", dataIndex: "reason" },
];

const PAGE_SIZE = 20;

function IssueTable({ title, rows }: { title: string; rows: CountImportIssue[] }) {
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
        pagination={rows.length > PAGE_SIZE ? { pageSize: PAGE_SIZE, showSizeChanger: false } : false}
        scroll={{ x: "max-content" }}
      />
    </div>
  );
}

/**
 * Bốn `Statistic` + hai bảng lỗi/bỏ qua của kết quả kiểm tra hoặc nạp — tách
 * khỏi `count-excel-import.tsx` để file chính không vượt ~200 dòng (khuôn
 * `provisional-stock-issues.tsx`).
 */
export function CountImportResultView({ result }: { result: CountImportResult }) {
  const { token } = theme.useToken();

  return (
    <>
      <div className="flex flex-wrap gap-x-10 gap-y-3">
        <Statistic
          title="Mới"
          value={result.newCount}
          groupSeparator="."
          styles={{ content: { color: token.colorSuccess } }}
        />
        <Statistic title="Ghi đè số cũ" value={result.overwriteCount} groupSeparator="." />
        <Statistic title="Bỏ qua (ô trống)" value={result.skippedCount} groupSeparator="." />
        <Statistic
          title="Lỗi"
          value={result.errorCount}
          groupSeparator="."
          styles={result.errorCount > 0 ? { content: { color: token.colorError } } : undefined}
        />
      </div>
      {result.overwriteCount > 0 ? (
        <Typography.Text type="secondary">
          Ghi đè số cũ sẽ chốt lại tồn sổ lúc nạp — số đếm trước đó của các mã này bị thay bằng số
          mới trong file.
        </Typography.Text>
      ) : null}
      <IssueTable title="Lỗi — dòng không nạp được" rows={result.errors} />
      <IssueTable title="Bỏ qua — ô trống, vẫn tính là chưa đếm" rows={result.skippedRows} />
    </>
  );
}
