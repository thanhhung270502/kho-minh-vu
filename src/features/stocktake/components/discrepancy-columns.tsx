"use client";

import { Button, Tag } from "antd";
import type { TableColumnsType } from "antd";

import { isLargeDiscrepancy } from "../lib/discrepancy";
import type { CountSheetRow } from "../types";

function formatTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${date.toLocaleDateString(
    "vi-VN",
    { day: "2-digit", month: "2-digit" },
  )}`;
}

function formatNumber(value: number): string {
  return value.toLocaleString("vi-VN");
}

function formatSigned(value: number): string {
  const text = formatNumber(Math.abs(value));
  if (value > 0) return `+${text}`;
  if (value < 0) return `−${text}`;
  return text;
}

type Params = {
  showKiotVietColumn: boolean;
  actionable: boolean;
  onSetRecount: (row: CountSheetRow, value: boolean) => void;
};

/**
 * Cấu hình cột thuần cho bảng lệch — tách khỏi `discrepancy-table.tsx` để file
 * đó không vượt 200 dòng (CLAUDE.md Bước 6). Chỉ nhận dòng ĐÃ đếm
 * (`lineId !== null`, `counted`/`bookQuantity`/`discrepancy` khác null) —
 * `discrepancy-table.tsx` lọc trước khi truyền vào `Table`.
 */
export function buildDiscrepancyColumns({
  showKiotVietColumn,
  actionable,
  onSetRecount,
}: Params): TableColumnsType<CountSheetRow> {
  return [
    {
      title: "Mã hàng",
      dataIndex: "code",
      key: "code",
      width: 140,
      render: (code: string) => <span className="font-mono">{code}</span>,
    },
    { title: "Tên hàng", dataIndex: "name", key: "name", ellipsis: true },
    { title: "ĐVT", dataIndex: "unitName", key: "unitName", width: 70 },
    {
      title: "Số đếm",
      dataIndex: "counted",
      key: "counted",
      width: 100,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "Tồn sổ lúc đếm",
      dataIndex: "bookQuantity",
      key: "bookQuantity",
      width: 120,
      align: "right",
      render: (value: number) => formatNumber(value),
    },
    {
      title: "Lệch",
      dataIndex: "discrepancy",
      key: "discrepancy",
      width: 100,
      align: "right",
      render: (value: number) => (
        <span className={value > 0 ? "text-green-600" : value < 0 ? "text-red-600" : ""}>
          {formatSigned(value)}
        </span>
      ),
    },
    ...(showKiotVietColumn
      ? [
          {
            title: (
              <span title="Số tạm nạp từ KiotViet trước đợt đếm — lệch lớn so với số này thường là đếm sót">
                Tồn KiotViet tạm
              </span>
            ),
            dataIndex: "kiotVietStock",
            key: "kiotVietStock",
            width: 130,
            align: "right" as const,
            render: (value: number | null) => (value === null ? "—" : formatNumber(value)),
          },
        ]
      : []),
    {
      title: "Đếm lúc",
      dataIndex: "countedAt",
      key: "countedAt",
      width: 110,
      render: (value: string | null) => formatTime(value),
    },
    { title: "Người đếm", dataIndex: "countedBy", key: "countedBy", width: 120 },
    {
      title: "Trạng thái",
      key: "status",
      width: 200,
      render: (_: unknown, row) => (
        <div className="flex flex-wrap gap-1">
          {isLargeDiscrepancy(row.counted ?? 0, row.bookQuantity ?? 0) ? (
            <Tag color="red">Lệch lớn</Tag>
          ) : null}
          {row.needsRecount ? <Tag color="orange">Chờ đếm lại</Tag> : null}
        </div>
      ),
    },
    ...(actionable
      ? [
          {
            title: "",
            key: "action",
            width: 160,
            render: (_: unknown, row: CountSheetRow) =>
              row.needsRecount ? (
                <Button type="link" size="small" className="px-0" onClick={() => onSetRecount(row, false)}>
                  Bỏ yêu cầu
                </Button>
              ) : (
                <Button type="link" size="small" className="px-0" onClick={() => onSetRecount(row, true)}>
                  Trả về đếm lại
                </Button>
              ),
          },
        ]
      : []),
  ];
}
