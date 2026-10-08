"use client";

import { Button, Input, InputNumber, Tooltip } from "antd";
import type { TableColumnsType } from "antd";

import { StatusDot } from "@/shared/components/status-dot";
import { StaffSelect } from "@/shared/components/staff-select";
import {
  COMMON_GOODS_LABEL,
  lineRecipientLabel,
  type StaffRef,
} from "@/shared/lib/recipient";

import type { OrderLine } from "../types";

function formatNumber(value: number | string | null): string {
  return value === null ? "" : Number(value).toLocaleString("vi-VN");
}

type Params = {
  editable: boolean;
  /** Chỉ hiện hai cột Đã xuất/Còn lại khi đơn đã có phiếu xuất. */
  showProgress: boolean;
  /** Chỉ hiện cột Người nhận khi đơn đa người nhận hoặc đã có dòng được gán. */
  showRecipient: boolean;
  staffCount: number;
  /** Nhân viên của đơn + người nhận ở các dòng, để người ngừng dùng vẫn hiện tên. */
  extraStaff: StaffRef[];
  onEditRecipient: (
    id: string,
    recipientId: string | null,
    name: string | undefined,
  ) => void;
  onEditQuantity: (id: string, quantity: number) => void;
  onEditNote: (id: string, note: string) => void;
  onDelete: (id: string) => void;
};

/**
 * Cấu hình cột thuần, tách khỏi `order-line-table.tsx` để file đó không vượt
 * 200 dòng (CLAUDE.md Bước 6) — không giữ state riêng, chỉ nhận callback.
 */
export function buildOrderLineColumns({
  editable,
  showProgress,
  showRecipient,
  staffCount,
  extraStaff,
  onEditRecipient,
  onEditQuantity,
  onEditNote,
  onDelete,
}: Params): TableColumnsType<OrderLine> {
  return [
    {
      title: "#",
      key: "index",
      width: 40,
      render: (_: unknown, __: OrderLine, index: number) => (
        <span className="tabular-nums text-trung-tinh-300">{index + 1}</span>
      ),
    },
    {
      title: "Mã hàng",
      dataIndex: "productCode",
      key: "productCode",
      width: 150,
      render: (code: string) => (
        <span className="font-mono text-[14.5px] font-medium">{code}</span>
      ),
    },
    {
      title: "Tên hàng",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
      render: (name: string) => <span className="font-semibold">{name}</span>,
    },
    { title: "ĐVT", dataIndex: "unitName", key: "unitName", width: 90 },
    ...(showRecipient
      ? [
          {
            title: "Người nhận",
            key: "recipient",
            width: 190,
            render: (_: unknown, line: OrderLine) =>
              editable ? (
                <StaffSelect
                  size="small"
                  placeholder={COMMON_GOODS_LABEL}
                  value={line.recipientId ?? undefined}
                  extraOptions={extraStaff}
                  onChange={(id, name) => onEditRecipient(line.id, id ?? null, name)}
                />
              ) : (
                lineRecipientLabel(line.recipientName, staffCount)
              ),
          },
        ]
      : []),
    {
      title: "Số lượng đặt",
      dataIndex: "orderedQuantity",
      key: "orderedQuantity",
      width: 130,
      align: "right",
      render: (value: number, line: OrderLine) =>
        editable ? (
          <InputNumber
            // Ô không kiểm soát: khi server đổi số (cộng dồn từ hàng nhập,
            // 20-15) phải dựng lại ô, không thì vẫn hiện số cũ. Số chỉ đổi
            // sau khi lưu nên không cắt ngang lúc đang gõ (bẫy 20).
            key={`${line.id}-${value}`}
            size="small"
            className="w-full"
            min={0}
            defaultValue={Number(value)}
            onBlur={(event) => {
              const parsed = Number(event.target.value.replace(/[^\d.-]/g, ""));
              if (
                Number.isFinite(parsed) &&
                parsed > 0 &&
                parsed !== Number(value)
              ) {
                onEditQuantity(line.id, parsed);
              }
            }}
          />
        ) : (
          formatNumber(value)
        ),
    },
    {
      title: "Ghi chú",
      dataIndex: "note",
      key: "note",
      width: 220,
      render: (note: string | null, line: OrderLine) =>
        editable ? (
          <Input
            // Không kiểm soát, lưu khi rời ô — key theo giá trị để dựng lại sau khi lưu (bẫy 20).
            key={`${line.id}-${note ?? ""}`}
            size="small"
            defaultValue={note ?? ""}
            placeholder="—"
            onBlur={(event) => {
              const next = event.target.value.trim();
              if (next !== (note ?? "")) onEditNote(line.id, next);
            }}
            onPressEnter={(event) => event.currentTarget.blur()}
          />
        ) : (
          <span className="text-chu-phu">{note ?? ""}</span>
        ),
    },
    ...(showProgress
      ? [
          {
            title: "Đã xuất",
            dataIndex: "shippedQuantity",
            key: "shippedQuantity",
            width: 110,
            align: "right" as const,
            render: (value: number) => formatNumber(value),
          },
          {
            title: "Còn lại",
            key: "remainingQuantity",
            dataIndex: "remainingQuantity",
            width: 120,
            align: "right" as const,
            // Tính khi render, KHÔNG giữ state (D-04) — remainingQuantity đã
            // tính sẵn trong toOrderLine của plan 04-06.
            render: (_: unknown, line: OrderLine) =>
              line.remainingQuantity === 0 && line.shippedQuantity > 0 ? (
                <StatusDot tone="done">Đã giao đủ</StatusDot>
              ) : (
                formatNumber(line.remainingQuantity)
              ),
          },
        ]
      : []),
    ...(editable
      ? [
          {
            title: "",
            key: "delete",
            width: 60,
            align: "right" as const,
            // Dòng đã có phiếu xuất không xóa được — xóa đi thì
            // so_luong_da_xuat treo không tham chiếu (T-04-46).
            render: (_: unknown, line: OrderLine) =>
              line.shippedQuantity > 0 ? (
                <Tooltip title="Dòng đã có hóa đơn, không xóa được">
                  <Button type="link" size="small" danger disabled className="px-0">
                    Xóa
                  </Button>
                </Tooltip>
              ) : (
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
