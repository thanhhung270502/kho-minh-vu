"use client";

import type { InputNumberRef } from "@rc-component/input-number";
import { App, Table } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useRef, useState } from "react";

import { useLookups } from "@/features/products/hooks/useProducts";
import type { ProductSearchResult } from "@/shared/components/product-search-input";
import { SummaryRow } from "@/shared/components/summary-row";
import { explainError } from "@/shared/lib/errors";

import {
  useAddIssueLine,
  useDeleteIssueLine,
  useUpdateIssueLine,
} from "../hooks/useIssues";
import type { IssueDetail, IssueLine } from "../types";
import { buildIssueLineColumns } from "./issue-line-columns";
import { IssueLineEntryRow } from "./issue-line-entry-row";

type Props = { issue: IssueDetail; lines: IssueLine[]; editable: boolean };

type DraftLine = {
  product: ProductSearchResult | null;
  quantity: number | null;
  warehouseId: string | null;
};

const EMPTY_DRAFT: DraftLine = { product: null, quantity: null, warehouseId: null };

/**
 * Bảng dòng phiếu xuất (XUAT-07): gõ mã → Enter (bắt ở `onKeyDownCapture`
 * BÊN TRONG `ProductSearchInput`, bẫy 14a, không bọc thêm capture ở đây) →
 * ô số lượng → Enter → lưu dòng → `setTimeout(..., 0)` đưa con trỏ về ô mã
 * (bẫy 14b). Không có cột nào về tiền — phiếu xuất không mang giá bán.
 *
 * D-12 lớp 1: `currentStock` là ảnh chụp lúc tải dòng, KHÔNG phải số thời
 * gian thực. So với số đang gõ dở (chưa lưu) để dòng đổi màu NGAY.
 */
export function IssueLineTable({ issue, lines, editable }: Props) {
  const { message } = App.useApp();
  const lookups = useLookups();
  const addLine = useAddIssueLine(issue.id);
  const updateLine = useUpdateIssueLine(issue.id);
  const deleteLine = useDeleteIssueLine(issue.id);

  const [draft, setDraft] = useState<DraftLine>(EMPTY_DRAFT);
  // Số đang gõ dở theo từng dòng (chưa lưu) — dùng để tô màu NGAY.
  const [pendingQuantities, setPendingQuantities] = useState<Record<string, number>>({});

  const codeInput = useRef<RefSelectProps>(null);
  const quantityInput = useRef<InputNumberRef>(null);

  const warehouses = lookups.data?.warehouses ?? [];
  const hasMultipleWarehouses = warehouses.length > 1;

  function currentQuantity(line: IssueLine): number {
    return pendingQuantities[line.id] ?? Number(line.quantity);
  }

  function isOverStock(line: IssueLine): boolean {
    return currentQuantity(line) > line.currentStock;
  }

  function handleQuantityInput(id: string, value: number | null, fallback: number) {
    setPendingQuantities((current) => {
      if (value === null || value === fallback) {
        const rest = { ...current };
        delete rest[id];
        return rest;
      }
      return { ...current, [id]: value };
    });
  }

  async function runMutation(action: () => Promise<unknown>) {
    try {
      await action();
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  function handleSelectProduct(product: ProductSearchResult) {
    // 4/3.270 mã chưa gán kho mặc định — không đoán kho, không rơi về kho đầu
    // phiếu (Claude's Discretion, 04-CONTEXT.md). Con trỏ ở lại ô mã.
    if (product.defaultWarehouseId === null) {
      message.error(
        `Mã ${product.code} chưa gán kho mặc định. Sửa ở Danh mục → mở mã hàng → Kho mặc định, rồi quay lại.`,
      );
      return;
    }
    setDraft({ product, quantity: null, warehouseId: product.defaultWarehouseId });
    setTimeout(() => quantityInput.current?.focus(), 0);
  }

  async function saveDraftLine() {
    const { product, quantity, warehouseId } = draft;
    if (!product || !quantity || quantity <= 0 || !warehouseId) {
      message.warning("Nhập mã hàng và số lượng lớn hơn 0.");
      return;
    }
    await runMutation(async () => {
      await addLine.mutateAsync({ productId: product.id, quantity, warehouseId });
      setDraft(EMPTY_DRAFT);
      setTimeout(() => codeInput.current?.focus(), 0);
    });
  }

  function editCell(id: string, patch: { quantity?: number; warehouseId?: string }) {
    const current = lines.find((line) => line.id === id);
    return runMutation(() =>
      updateLine.mutateAsync({
        id,
        values: {
          quantity: patch.quantity ?? Number(current?.quantity ?? 0),
          warehouseId: patch.warehouseId ?? current?.warehouseId ?? null,
        },
      }),
    );
  }

  const columns = buildIssueLineColumns({
    editable,
    hasMultipleWarehouses,
    warehouses,
    isOverStock,
    currentQuantity,
    onQuantityInput: handleQuantityInput,
    onEditQuantity: (id, quantity) => void editCell(id, { quantity }),
    onEditWarehouse: (id, warehouseId) => void editCell(id, { warehouseId }),
    onDelete: (id) => void runMutation(() => deleteLine.mutateAsync(id)),
  });

  const totalQuantity = lines.reduce((sum, line) => sum + currentQuantity(line), 0);

  return (
    <>
      <div className="overflow-x-auto">
        <Table<IssueLine>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={lines}
          pagination={false}
          scroll={{ x: 760 }}
          // D-12 lớp 1: nền đỏ nhạt ngay khi dòng vượt tồn, tính khi render
          // (CLAUDE.md Bước 6) — không giữ state riêng cho việc tô màu.
          rowClassName={(line) => (isOverStock(line) ? "bg-red-50" : "")}
          locale={{ emptyText: "Chưa có dòng nào. Gõ mã hàng ở ô bên dưới để thêm." }}
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

      {editable ? (
        <IssueLineEntryRow
          codeInputRef={codeInput}
          quantityInputRef={quantityInput}
          quantity={draft.quantity}
          warehouseId={draft.warehouseId}
          warehouses={warehouses}
          hasMultipleWarehouses={hasMultipleWarehouses}
          pending={addLine.isPending}
          onSelectProduct={handleSelectProduct}
          onQuantityChange={(value) =>
            setDraft((current) => ({ ...current, quantity: value }))
          }
          onWarehouseChange={(warehouseId) =>
            setDraft((current) => ({ ...current, warehouseId }))
          }
          onSubmit={() => void saveDraftLine()}
        />
      ) : null}
    </>
  );
}
