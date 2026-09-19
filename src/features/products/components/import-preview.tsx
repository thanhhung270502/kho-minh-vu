"use client";

import { Alert, Button, Statistic, Table, Tabs, Tag, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";

import type {
  ImportChangeRow,
  ImportErrorRow,
  ImportResponse,
} from "../api/excel-import.api";
import { buildErrorCsv, errorFileName } from "../lib/error-file";
import { columnLabel } from "../lib/excel-template";

function renderValue(value: unknown): string {
  if (value === null || value === undefined || value === "") return "(trống)";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

function downloadCsv(errors: ImportErrorRow[], sourceName: string) {
  const url = URL.createObjectURL(buildErrorCsv(errors));
  const link = document.createElement("a");
  link.href = url;
  link.download = errorFileName(sourceName);
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

const ERROR_COLUMNS: ColumnsType<ImportErrorRow> = [
  { title: "Dòng", dataIndex: "row", width: 80 },
  {
    title: "Cột",
    dataIndex: "column",
    width: 160,
    render: (column: string) => columnLabel(column),
  },
  { title: "Lý do", dataIndex: "message" },
];

export function ImportPreview({
  response,
  fileName,
}: {
  response: ImportResponse;
  fileName: string;
}) {
  const { result, format } = response;
  const updated = result.changes.filter((change) => change.kind === "SUA");
  const added = result.changes.filter((change) => change.kind === "THEM");

  const updatedColumns: ColumnsType<ImportChangeRow> = [
    { title: "Dòng", dataIndex: "row", width: 80 },
    { title: "Mã hàng", dataIndex: "code", width: 170 },
    {
      title: "Thay đổi",
      key: "fields",
      render: (_, change) => (
        <ul className="mb-0 list-none ps-0 text-sm">
          {Object.entries(change.fields ?? {}).map(([field, values]) => (
            <li key={field}>
              <span className="text-gray-500">{columnLabel(field)}:</span>{" "}
              <span className="text-gray-400 line-through">
                {renderValue(values?.[0])}
              </span>{" "}
              → {renderValue(values?.[1])}
            </li>
          ))}
        </ul>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Tag color={format === "mau_moi" ? "blue" : "orange"}>
          {format === "mau_moi" ? "Mẫu hệ mới" : "File KiotViet"}
        </Tag>
        <Typography.Text type="secondary">{fileName}</Typography.Text>
      </div>

      {format === "kiotviet" ? (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="File KiotViet: công đoạn chỉ cập nhật cho mã suy được từ ô ĐVT (Carbon, Sơn, Xi mạ, Ép, Nano). Mã “CÁI/CẶP/BỘ” giữ nguyên công đoạn đã rà; mã mới nhận Mua ngoài."
        />
      ) : null}

      <div className="mb-3 flex flex-wrap gap-8">
        <Statistic
          title="Thêm mới"
          value={result.added}
          valueStyle={{ color: "#389e0d" }}
        />
        <Statistic title="Sửa" value={result.updated} valueStyle={{ color: "#1677ff" }} />
        <Statistic title="Không đổi" value={result.unchanged} />
        <Statistic
          title="Lỗi"
          value={result.errors.length}
          valueStyle={result.errors.length ? { color: "#cf1322" } : undefined}
        />
      </div>

      {result.changesTruncated ? (
        <Typography.Text type="secondary" className="mb-2 block">
          Chỉ hiện 500 thay đổi đầu — toàn bộ vẫn được nạp.
        </Typography.Text>
      ) : null}

      <div className="max-h-[60vh] overflow-auto">
        <Tabs
          defaultActiveKey={result.errors.length > 0 ? "errors" : "updated"}
          items={[
            {
              key: "errors",
              label: `Lỗi (${result.errors.length})`,
              children: (
                <>
                  {result.errors.length > 0 ? (
                    <Button
                      className="mb-2"
                      size="small"
                      onClick={() => downloadCsv(result.errors, fileName)}
                    >
                      Tải danh sách lỗi (.csv)
                    </Button>
                  ) : null}
                  <Table<ImportErrorRow>
                    rowKey={(row) => `${row.row}-${row.column}`}
                    size="small"
                    columns={ERROR_COLUMNS}
                    dataSource={result.errors}
                    pagination={false}
                    locale={{ emptyText: "Không có lỗi nào." }}
                  />
                </>
              ),
            },
            {
              key: "updated",
              label: `Sửa (${result.updated})`,
              children: (
                <Table<ImportChangeRow>
                  rowKey="row"
                  size="small"
                  columns={updatedColumns}
                  dataSource={updated}
                  pagination={false}
                  locale={{ emptyText: "Không có mã nào thay đổi." }}
                />
              ),
            },
            {
              key: "added",
              label: `Thêm (${result.added})`,
              children: (
                <Table<ImportChangeRow>
                  rowKey="row"
                  size="small"
                  columns={[
                    { title: "Dòng", dataIndex: "row", width: 80 },
                    { title: "Mã hàng", dataIndex: "code" },
                  ]}
                  dataSource={added}
                  pagination={false}
                  locale={{ emptyText: "Không có mã mới." }}
                />
              ),
            },
          ]}
        />
      </div>
    </>
  );
}
