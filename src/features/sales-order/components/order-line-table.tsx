"use client";

import type { InputNumberRef } from "@rc-component/input-number";
import { App, Table } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useRef, useState } from "react";

import type { ProductSearchResult } from "@/shared/components/product-search-input";
import { SummaryRow } from "@/shared/components/summary-row";
import { explainError } from "@/shared/lib/errors";

import {
  useAddOrderLine,
  useDeleteOrderLine,
  useUpdateOrderLine,
} from "../hooks/useOrders";
import type { OrderLine } from "../types";
import { buildOrderLineColumns } from "./order-line-columns";
import { OrderLineEntryRow } from "./order-line-entry-row";

type Props = {
  orderId: string;
  lines: OrderLine[];
  editable: boolean;
};

type DraftLine = {
  product: ProductSearchResult | null;
  quantity: number | null;
};

const EMPTY_DRAFT: DraftLine = { product: null, quantity: null };

/**
 * Luồng bàn phím (XUAT-07): gõ mã → Enter → ô số lượng → Enter → lưu dòng,
 * con trỏ quay về ô mã. Không có cột giá hay cột tổng thành tiền nào cả — đơn
 * không mang giá (chốt 19/09 câu 7).
 *
 * Enter ở ô mã hàng bắt ở `onKeyDownCapture` BÊN TRONG `ProductSearchInput`
 * (đã chữa bẫy 14a ở plan 04-05) — không lặp lại logic đó ở đây, dùng lại
 * nguyên `OrderLineEntryRow` → `ProductSearchInput`.
 * `remainingQuantity` hiển thị ở `order-line-columns.tsx`, tính sẵn trong
 * `toOrderLine` của plan 04-06 — không lưu lại ở state của file này.
 */
export function OrderLineTable({ orderId, lines, editable }: Props) {
  const { message } = App.useApp();
  const addLine = useAddOrderLine(orderId);
  const updateLine = useUpdateOrderLine(orderId);
  const deleteLine = useDeleteOrderLine(orderId);

  const [draft, setDraft] = useState<DraftLine>(EMPTY_DRAFT);

  const codeInput = useRef<RefSelectProps>(null);
  const quantityInput = useRef<InputNumberRef>(null);

  // Cột Đã xuất/Còn lại chỉ hiện khi đơn đã có phiếu xuất — trước đó mọi dòng
  // đều bằng số đặt, thêm hai cột chỉ gây rối mắt.
  const showProgress = lines.some((line) => line.shippedQuantity > 0);

  async function saveDraftLine() {
    if (!draft.product || !draft.quantity || draft.quantity <= 0) {
      message.warning("Nhập mã hàng và số lượng lớn hơn 0.");
      return;
    }

    try {
      await addLine.mutateAsync({
        productId: draft.product.id,
        quantity: draft.quantity,
      });
      setDraft(EMPTY_DRAFT);
      // Hẹn sang lượt sau: focus ngay lúc này bị chính vòng render dọn bảng
      // xoá đi, con trỏ rơi sai chỗ (bẫy 14b).
      setTimeout(() => codeInput.current?.focus(), 0);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  async function editQuantity(id: string, quantity: number) {
    try {
      await updateLine.mutateAsync({ id, values: { quantity } });
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  async function removeLine(id: string) {
    try {
      await deleteLine.mutateAsync(id);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  const columns = buildOrderLineColumns({
    editable,
    showProgress,
    onEditQuantity: (id, quantity) => void editQuantity(id, quantity),
    onDelete: (id) => void removeLine(id),
  });

  const totalQuantity = lines.reduce(
    (sum, line) => sum + Number(line.orderedQuantity),
    0,
  );

  return (
    <>
      <div className="overflow-x-auto">
        <Table<OrderLine>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={lines}
          pagination={false}
          scroll={{ x: 760 }}
          locale={{ emptyText: "Chưa có dòng nào. Gõ mã hàng ở ô bên dưới để thêm." }}
          summary={() =>
            lines.length > 0 ? (
              <SummaryRow
                columns={columns}
                hasSelection={false}
                label={`Tổng cộng — ${lines.length} dòng`}
                totals={{ orderedQuantity: totalQuantity }}
              />
            ) : null
          }
        />
      </div>

      {editable ? (
        <OrderLineEntryRow
          codeInputRef={codeInput}
          quantityInputRef={quantityInput}
          quantity={draft.quantity}
          pending={addLine.isPending}
          onSelectProduct={(product) => {
            setDraft((current) => ({ ...current, product }));
            setTimeout(() => quantityInput.current?.focus(), 0);
          }}
          onQuantityChange={(value) =>
            setDraft((current) => ({ ...current, quantity: value }))
          }
          onSubmit={() => void saveDraftLine()}
        />
      ) : null}
    </>
  );
}
