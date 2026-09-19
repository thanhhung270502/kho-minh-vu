"use client";

import type { InputNumberRef } from "@rc-component/input-number";
import { Alert, App, Button, InputNumber, Select, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useRef, useState } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { SummaryRow } from "@/shared/components/summary-row";
import { explainError } from "@/shared/lib/errors";

import {
  useAddReceiptLine,
  useDeleteReceiptLine,
  useUpdateReceiptLine,
} from "../hooks/useReceipts";
import type { DocumentDetail, DocumentLine } from "../types";
import { ProductSearchInput, type ProductSearchResult } from "./product-search-input";

function formatNumber(value: number | string | null): string {
  return value === null ? "" : Number(value).toLocaleString("vi-VN");
}

type Props = {
  receipt: DocumentDetail;
  lines: DocumentLine[];
  canEdit: boolean;
};

type DraftLine = {
  product: ProductSearchResult | null;
  quantity: number | null;
  unitPrice: number | null;
  warehouseId: string | null;
};

const EMPTY_DRAFT: DraftLine = {
  product: null,
  quantity: null,
  unitPrice: null,
  warehouseId: null,
};

/**
 * Luồng bàn phím (D-07): gõ mã → Enter → ô số lượng → Enter → ô đơn giá →
 * Enter là lưu dòng và quay về ô mã. 7,6 dòng mỗi phiếu, phiếu lớn nhất 48 dòng.
 */
export function ReceiptLineTable({ receipt, lines, canEdit }: Props) {
  const { message } = App.useApp();
  const lookups = useLookups();
  const addLine = useAddReceiptLine(receipt.id);
  const updateLine = useUpdateReceiptLine(receipt.id);
  const deleteLine = useDeleteReceiptLine(receipt.id);

  const [draft, setDraft] = useState<DraftLine>(EMPTY_DRAFT);

  const codeInput = useRef<RefSelectProps>(null);
  const quantityInput = useRef<InputNumberRef>(null);
  const priceInput = useRef<InputNumberRef>(null);

  const editable = receipt.status === "NHAP_LIEU" && canEdit;
  const warehouses = lookups.data?.warehouses ?? [];
  const hasMultipleWarehouses = warehouses.length > 1;

  async function saveDraftLine() {
    if (!draft.product || !draft.quantity || draft.quantity <= 0) {
      message.warning("Nhập mã hàng và số lượng lớn hơn 0.");
      return;
    }

    try {
      await addLine.mutateAsync({
        productId: draft.product.id,
        quantity: draft.quantity,
        unitPrice: draft.unitPrice ?? 0,
        warehouseId: draft.warehouseId,
      });
      setDraft(EMPTY_DRAFT);
      // Hẹn sang lượt sau: focus ngay lúc này sẽ bị chính vòng render dọn bảng
      // xoá đi, con trỏ rơi về ô đơn giá và mã kế tiếp gõ vào nhầm chỗ.
      setTimeout(() => codeInput.current?.focus(), 0);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  async function editCell(
    id: string,
    patch: { quantity?: number; unitPrice?: number; warehouseId?: string | null },
  ) {
    try {
      const current = lines.find((line) => line.id === id);
      await updateLine.mutateAsync({
        id,
        values: {
          quantity: patch.quantity ?? Number(current?.quantity ?? 0),
          unitPrice: patch.unitPrice ?? Number(current?.unitPrice ?? 0),
          ...(patch.warehouseId !== undefined
            ? { warehouseId: patch.warehouseId }
            : {}),
        },
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
      width: 160,
      render: (code: string) => <span className="font-mono">{code}</span>,
    },
    {
      title: "Tên hàng",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
    },
    { title: "ĐVT", dataIndex: "unitName", key: "unitName", width: 90 },
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
                  onChange={(value) => void editCell(line.id, { warehouseId: value })}
                />
              ) : (
                name
              ),
          },
        ]
      : []),
    {
      title: "Số lượng",
      dataIndex: "quantity",
      key: "quantity",
      width: 120,
      align: "right",
      render: (value: number, line: DocumentLine) =>
        editable ? (
          <InputNumber
            size="small"
            className="w-full"
            min={0}
            defaultValue={Number(value)}
            onBlur={(event) => {
              const parsed = Number(event.target.value.replace(/[^\d.-]/g, ""));
              if (Number.isFinite(parsed) && parsed !== Number(value)) {
                void editCell(line.id, { quantity: parsed });
              }
            }}
          />
        ) : (
          formatNumber(value)
        ),
    },
    {
      title: "Đơn giá",
      dataIndex: "unitPrice",
      key: "unitPrice",
      width: 140,
      align: "right",
      render: (value: number, line: DocumentLine) =>
        editable ? (
          <InputNumber
            size="small"
            className="w-full"
            min={0}
            defaultValue={Number(value)}
            formatter={(input) => (input === undefined ? "" : formatNumber(input))}
            parser={(input) => Number((input ?? "").replace(/\D/g, ""))}
            onBlur={(event) => {
              const parsed = Number(event.target.value.replace(/\D/g, ""));
              if (Number.isFinite(parsed) && parsed !== Number(value)) {
                void editCell(line.id, { unitPrice: parsed });
              }
            }}
          />
        ) : (
          formatNumber(value)
        ),
    },
    {
      title: "Thành tiền",
      key: "amount",
      dataIndex: "amount",
      width: 140,
      align: "right",
      // Tính khi render, KHÔNG giữ state (CLAUDE.md Bước 6).
      render: (_: unknown, line: DocumentLine) =>
        formatNumber(Number(line.quantity) * Number(line.unitPrice)),
    },
    ...(editable
      ? [
          {
            title: "",
            key: "delete",
            width: 60,
            align: "right" as const,
            render: (_: unknown, line: DocumentLine) => (
              <Button
                type="link"
                size="small"
                danger
                className="px-0"
                onClick={() => void deleteLine.mutateAsync(line.id)}
              >
                Xóa
              </Button>
            ),
          },
        ]
      : []),
  ];

  const totalQuantity = lines.reduce((sum, line) => sum + Number(line.quantity), 0);
  const totalAmount = lines.reduce(
    (sum, line) => sum + Number(line.quantity) * Number(line.unitPrice),
    0,
  );
  const linesMissingPrice = lines.filter((line) => Number(line.unitPrice) <= 0);

  return (
    <>
      {linesMissingPrice.length > 0 && editable ? (
        <Alert
          className="mb-3"
          type="warning"
          showIcon
          title={`${linesMissingPrice.length} dòng chưa có đơn giá`}
          description={`Ghi sổ sẽ bị chặn cho tới khi điền đơn giá: ${linesMissingPrice
            .slice(0, 3)
            .map((line) => line.productCode)
            .join(", ")}${linesMissingPrice.length > 3 ? "…" : ""}`}
        />
      ) : null}

      <div className="overflow-x-auto">
        <Table<DocumentLine>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={lines}
          pagination={false}
          scroll={{ x: 900 }}
          locale={{ emptyText: "Chưa có dòng nào. Gõ mã hàng ở ô bên dưới để thêm." }}
          summary={() =>
            lines.length > 0 ? (
              <SummaryRow
                columns={columns}
                hasSelection={false}
                label={`Tổng cộng — ${lines.length} dòng`}
                totals={{ quantity: totalQuantity, amount: totalAmount }}
              />
            ) : null
          }
        />
      </div>

      {editable ? (
        <div className="mt-3 flex flex-wrap items-end gap-2 rounded-the bg-nen-tong p-3">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-[13px] text-chu-phu">Mã hàng</label>
            <ProductSearchInput
              inputRef={codeInput}
              disabled={addLine.isPending}
              onSelect={(product) => {
                setDraft((current) => ({
                  ...current,
                  product,
                  warehouseId: current.warehouseId ?? null,
                }));
                setTimeout(() => quantityInput.current?.focus(), 0);
              }}
            />
          </div>

          {hasMultipleWarehouses ? (
            <div className="w-36">
              <label className="mb-1 block text-[13px] text-chu-phu">Kho</label>
              <Select
                className="w-full"
                placeholder={receipt.warehouseName ?? "Kho phiếu"}
                allowClear
                value={draft.warehouseId}
                options={warehouses.map((warehouse) => ({
                  value: warehouse.id,
                  label: warehouse.name,
                }))}
                onChange={(value) =>
                  setDraft((current) => ({ ...current, warehouseId: value ?? null }))
                }
              />
            </div>
          ) : null}

          <div className="w-28">
            <label className="mb-1 block text-[13px] text-chu-phu">Số lượng</label>
            <InputNumber
              ref={quantityInput}
              className="w-full"
              min={0}
              value={draft.quantity}
              onChange={(value) =>
                setDraft((current) => ({ ...current, quantity: value }))
              }
              onPressEnter={(event) => {
                event.preventDefault();
                priceInput.current?.focus();
              }}
            />
          </div>

          <div className="w-36">
            <label className="mb-1 block text-[13px] text-chu-phu">Đơn giá</label>
            <InputNumber
              ref={priceInput}
              className="w-full"
              min={0}
              value={draft.unitPrice}
              formatter={(input) => (input === undefined ? "" : formatNumber(input))}
              parser={(input) => Number((input ?? "").replace(/\D/g, ""))}
              onChange={(value) =>
                setDraft((current) => ({ ...current, unitPrice: value }))
              }
              onPressEnter={(event) => {
                event.preventDefault();
                void saveDraftLine();
              }}
            />
          </div>

          <Button
            type="primary"
            loading={addLine.isPending}
            onClick={() => void saveDraftLine()}
          >
            Thêm dòng
          </Button>

          <Typography.Text type="secondary" className="w-full text-xs">
            Gõ mã → Enter → số lượng → Enter → đơn giá → Enter là xong một dòng.
          </Typography.Text>
        </div>
      ) : null}
    </>
  );
}
