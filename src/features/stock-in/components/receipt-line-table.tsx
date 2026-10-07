"use client";

import type { InputNumberRef } from "@rc-component/input-number";
import { App, Button, InputNumber, Select, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useRef, useState } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import { SummaryRow } from "@/shared/components/summary-row";
import { useFocusOnOpen } from "@/shared/hooks/use-focus-on-open";
import { explainError } from "@/shared/lib/errors";

import {
  useAddReceiptLine,
  useDeleteReceiptLine,
  useUpdateReceiptLine,
} from "../hooks/useReceipts";
import type { DocumentDetail, DocumentLine } from "../types";
import { ProductSearchInput, type ProductSearchResult } from "@/shared/components/product-search-input";

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
  warehouseId: string | null;
};

const EMPTY_DRAFT: DraftLine = {
  product: null,
  quantity: null,
  warehouseId: null,
};

/**
 * Luồng bàn phím (D-07): gõ mã → Enter → ô số lượng → Enter là lưu dòng và quay
 * về ô mã. 7,6 dòng mỗi phiếu, phiếu lớn nhất 48 dòng.
 *
 * Không hiện giá (04/10/2026: hệ thống bỏ giá ở mọi màn) — dòng mới ghi đơn giá 0,
 * dòng cũ giữ nguyên đơn giá đã có khi sửa số lượng.
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

  const editable = receipt.status === "NHAP_LIEU" && canEdit;
  useFocusOnOpen(codeInput, editable);
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
        unitPrice: 0,
        warehouseId: draft.warehouseId,
      });
      setDraft(EMPTY_DRAFT);
      // Hẹn sang lượt sau: focus ngay lúc này sẽ bị chính vòng render dọn bảng
      // xoá đi, con trỏ rơi về ô số lượng và mã kế tiếp gõ vào nhầm chỗ.
      setTimeout(() => codeInput.current?.focus(), 0);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  async function editCell(
    id: string,
    patch: { quantity?: number; warehouseId?: string | null },
  ) {
    try {
      const current = lines.find((line) => line.id === id);
      await updateLine.mutateAsync({
        id,
        values: {
          quantity: patch.quantity ?? Number(current?.quantity ?? 0),
          unitPrice: Number(current?.unitPrice ?? 0),
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
      width: 140,
      render: (code: string) => <span className="font-mono">{code}</span>,
    },
    {
      title: "Tên hàng",
      dataIndex: "productName",
      key: "productName",
      ellipsis: true,
    },
    { title: "ĐVT", dataIndex: "unitName", key: "unitName", width: 70 },
    ...(hasMultipleWarehouses
      ? [
          {
            title: "Kho",
            dataIndex: "warehouseName",
            key: "warehouseName",
            width: 110,
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
      width: 110,
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

  // Cùng khuôn bảng "Hàng đặt" của đơn đặt: MỘT khối (tiêu đề → ô nhập → bảng) để
  // lưới hai cột của trang phiếu không tách ô nhập sang cột phải.
  return (
    <section className="min-w-0 overflow-hidden rounded-the border border-vien">
      <div className="px-5 py-4 text-[15px] font-extrabold">
        Hàng nhập{" "}
        <span className="font-semibold text-trung-tinh-300">· {lines.length} dòng</span>
      </div>

      {editable ? (
        <div className="flex flex-wrap items-end gap-2 border-t border-vien bg-nen-tong p-4">
          <div className="min-w-56 flex-1">
            <label className="mb-1 block text-[14px] text-chu-phu">Mã hàng</label>
            <ProductSearchInput
              inputRef={codeInput}
              disabled={addLine.isPending}
              selected={draft.product}
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
              <label className="mb-1 block text-[14px] text-chu-phu">Kho</label>
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
            <label className="mb-1 block text-[14px] text-chu-phu">Số lượng</label>
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
            Gõ mã → Enter → số lượng → Enter là xong một dòng, con trỏ quay về ô mã.
          </Typography.Text>
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table<DocumentLine>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={lines}
          pagination={false}
          // Bảng nằm cột trái (khung Thông tin phiếu bên phải) — đủ hẹp để thấy cột Số lượng.
          scroll={{ x: 680 }}
          locale={{ emptyText: "Chưa có dòng nào. Gõ mã hàng ở ô phía trên để thêm." }}
          summary={() =>
            lines.length > 0 ? (
              <SummaryRow
                columns={columns}
                hasSelection={false}
                label={`Tổng cộng — ${lines.length} dòng`}
                totals={{ quantity: totalQuantity }}
              />
            ) : null
          }
        />
      </div>
    </section>
  );
}
