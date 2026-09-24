"use client";

import { Button, InputNumber, Popconfirm, Tag } from "antd";
import type { TableColumnsType } from "antd";

import type { CountSheetRow } from "../types";

function formatTime(value: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  return `${date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })} ${date.toLocaleDateString(
    "vi-VN",
    { day: "2-digit", month: "2-digit" },
  )}`;
}

/** Id DOM của ô số đếm — dùng để focus dòng kế bằng `document.getElementById`,
 * không dùng `useRef` (nguồn của mỗi dòng bị Table re-render liên tục, và
 * React Compiler cấm truyền ref vào hàm dựng cột gọi lúc render — bẫy 14b kiểu mới). */
export function countInputDomId(productId: string): string {
  return `dem-so-luong-${productId}`;
}

type Params = {
  editable: boolean;
  pendingValue: (productId: string) => number | null;
  onInput: (productId: string, value: number | null) => void;
  onCommit: (row: CountSheetRow) => void;
  onDelete: (row: CountSheetRow) => void;
};

/**
 * Cấu hình cột thuần cho bảng đếm văn phòng — tách khỏi `count-desk-table.tsx`
 * để file đó không vượt 200 dòng (CLAUDE.md Bước 6). Đếm mù: KHÔNG có cột tồn
 * sổ/tồn KiotViet/lệch (D-08) — lệch chỉ hiện ở tab Bảng lệch (06-12).
 */
export function buildCountDeskColumns({
  editable,
  pendingValue,
  onInput,
  onCommit,
  onDelete,
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
    { title: "Nhóm", dataIndex: "categoryName", key: "categoryName", width: 140 },
    {
      title: "Số đếm",
      dataIndex: "counted",
      key: "counted",
      width: 130,
      render: (_: unknown, row) => (
        <InputNumber
          id={countInputDomId(row.productId)}
          size="small"
          className="w-full"
          min={0}
          disabled={!editable}
          value={pendingValue(row.productId) ?? row.counted}
          onChange={(value) => onInput(row.productId, value)}
          onPressEnter={() => onCommit(row)}
          onBlur={() => onCommit(row)}
        />
      ),
    },
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
      width: 110,
      render: (_: unknown, row) => {
        if (row.needsRecount) return <Tag color="red">Cần đếm lại</Tag>;
        if (row.lineId === null) return <Tag color="default">Chưa đếm</Tag>;
        return null;
      },
    },
    ...(editable
      ? [
          {
            title: "",
            key: "action",
            width: 100,
            render: (_: unknown, row: CountSheetRow) =>
              row.lineId ? (
                <Popconfirm
                  title="Xóa số đếm"
                  description="Mã sẽ quay về chưa đếm."
                  onConfirm={() => onDelete(row)}
                >
                  <Button type="link" size="small" danger className="px-0">
                    Xóa số đếm
                  </Button>
                </Popconfirm>
              ) : null,
          },
        ]
      : []),
  ];
}
