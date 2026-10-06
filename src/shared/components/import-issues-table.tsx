"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { Button, Table } from "antd";

import { buildCsv, downloadBlob } from "@/shared/lib/csv";

import type { ImportIssue } from "@/shared/lib/excel-import";

type Props = {
  issues: ImportIssue[];
  /** Tên file tải về khi bấm "Tải danh sách". */
  fileName: string;
};

/** Bảng lỗi / cảnh báo theo dòng Excel — kèm nút tải ra file để sửa song song. */
export function ImportIssuesTable({ issues, fileName }: Props) {
  const rows = issues.map((issue, index) => ({ ...issue, key: `${issue.row}-${index}` }));
  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end">
        <Button
          size="small"
          icon={<DownloadOutlined />}
          onClick={() =>
            downloadBlob(
              buildCsv(
                ["Dòng", "Số phiếu", "Nội dung"],
                issues.map((i) => [i.row || "", i.docNo, i.message]),
              ),
              fileName,
            )
          }
        >
          Tải danh sách
        </Button>
      </div>
      <Table
        size="small"
        rowKey="key"
        dataSource={rows}
        pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
        scroll={{ x: 560 }}
        columns={[
          { title: "Dòng", dataIndex: "row", width: 70, render: (v: number) => v || "—" },
          { title: "Số phiếu", dataIndex: "docNo", width: 120, render: (v: string) => <span className="font-mono">{v || "—"}</span> },
          { title: "Nội dung", dataIndex: "message" },
        ]}
      />
    </div>
  );
}
