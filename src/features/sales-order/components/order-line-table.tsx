"use client";

import type { InputNumberRef } from "@rc-component/input-number";
import { App, Table } from "antd";
import type { RefSelectProps } from "antd/es/select";
import { useRef, useState } from "react";

import type { ProductSearchResult } from "@/shared/components/product-search-input";
import { SummaryRow } from "@/shared/components/summary-row";
import { useFocusOnOpen } from "@/shared/hooks/use-focus-on-open";
import { isMultiRecipientOrder, type StaffRef } from "@/shared/lib/recipient";

import { useOrderLineActions } from "../hooks/use-order-line-actions";
import type { OrderLine } from "../types";
import { buildOrderLineColumns } from "./order-line-columns";
import { OrderLineEntryRow } from "./order-line-entry-row";

type Props = {
  orderId: string;
  lines: OrderLine[];
  editable: boolean;
  staff: StaffRef[];
};

type DraftLine = {
  product: ProductSearchResult | null;
  quantity: number | null;
  note: string;
};

const EMPTY_DRAFT: DraftLine = { product: null, quantity: null, note: "" };

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
export function OrderLineTable({ orderId, lines, editable, staff }: Props) {
  const { message } = App.useApp();
  const actions = useOrderLineActions(orderId, staff);

  const [draft, setDraft] = useState<DraftLine>(EMPTY_DRAFT);
  // Người nhận dính qua các lần thêm dòng; không reset khi lưu dòng.
  const [draftRecipientId, setDraftRecipientId] = useState<string | null>(null);

  const codeInput = useRef<RefSelectProps>(null);
  useFocusOnOpen(codeInput, editable);
  const quantityInput = useRef<InputNumberRef>(null);

  // Cột Đã xuất/Còn lại chỉ hiện khi đơn đã có phiếu xuất — trước đó mọi dòng
  // đều bằng số đặt, thêm hai cột chỉ gây rối mắt.
  const showProgress = lines.some((line) => line.shippedQuantity > 0);

  const showRecipient = isMultiRecipientOrder(
    staff.length,
    lines.some((line) => line.recipientId !== null),
  );
  // Người bị bỏ khỏi đơn thì tự rơi về "Chung".
  const effectiveRecipientId =
    draftRecipientId !== null && staff.some((p) => p.id === draftRecipientId)
      ? draftRecipientId
      : null;
  const extraStaff = [...staff];
  for (const line of lines) {
    if (line.recipientId && !extraStaff.some((p) => p.id === line.recipientId)) {
      extraStaff.push({ id: line.recipientId, name: line.recipientName ?? "?" });
    }
  }

  async function saveDraftLine() {
    if (!draft.product || !draft.quantity || draft.quantity <= 0) {
      message.warning("Nhập mã hàng và số lượng lớn hơn 0.");
      return;
    }

    const saved = await actions.addLine(
      {
        productId: draft.product.id,
        quantity: draft.quantity,
        recipientId: showRecipient ? effectiveRecipientId : null,
        note: draft.note,
      },
      draft.product.code,
    );
    if (!saved) return;
    setDraft(EMPTY_DRAFT);
    // Hẹn sang lượt sau: focus ngay lúc này bị chính vòng render dọn bảng
    // xoá đi, con trỏ rơi sai chỗ (bẫy 14b).
    setTimeout(() => codeInput.current?.focus(), 0);
  }

  const columns = buildOrderLineColumns({
    editable,
    showProgress,
    showRecipient,
    staffCount: staff.length,
    extraStaff,
    onEditRecipient: (id, recipientId, name) =>
      void actions.editRecipient(id, recipientId, name),
    onEditQuantity: (id, quantity) => void actions.editQuantity(id, quantity),
    onEditNote: (id, note) => void actions.editNote(id, note),
    onDelete: (id) => void actions.removeLine(id),
  });

  const totalQuantity = lines.reduce(
    (sum, line) => sum + Number(line.orderedQuantity),
    0,
  );

  return (
    <section className="min-w-0 overflow-hidden rounded-the border border-vien bg-nen-the shadow-the">
      <div className="px-5 py-4 text-[16px] font-extrabold">
        Hàng đặt{" "}
        <span className="font-semibold text-trung-tinh-300">· {lines.length} dòng</span>
      </div>

      {editable ? (
        <div className="border-t border-vien bg-white p-4 [&>div]:mt-0 [&>div]:rounded-none [&>div]:border-0 [&>div]:bg-transparent [&>div]:p-0">
        <OrderLineEntryRow
          codeInputRef={codeInput}
          quantityInputRef={quantityInput}
          quantity={draft.quantity}
          note={draft.note}
          selectedProduct={draft.product}
          pending={actions.adding}
          staff={staff}
          showRecipient={showRecipient}
          recipientId={effectiveRecipientId}
          onRecipientChange={setDraftRecipientId}
          onSelectProduct={(product) => {
            setDraft((current) => ({ ...current, product }));
            setTimeout(() => quantityInput.current?.focus(), 0);
          }}
          onQuantityChange={(value) =>
            setDraft((current) => ({ ...current, quantity: value }))
          }
          onNoteChange={(value) => setDraft((current) => ({ ...current, note: value }))}
          onSubmit={() => void saveDraftLine()}
        />
        </div>
      ) : null}

      <div className="overflow-x-auto">
        <Table<OrderLine>
          rowKey="id"
          size="small"
          columns={columns}
          dataSource={lines}
          pagination={false}
          scroll={{ x: 910 }}
          locale={{ emptyText: "Chưa có dòng nào. Gõ mã hàng ở ô phía trên để thêm." }}
          summary={() =>
            lines.length > 0 ? (
              <SummaryRow
                columns={columns}
                hasSelection={false}
                label={`Tổng cộng — ${lines.length} dòng`}
                // Cột # hẹp đứng đầu: nhãn trải qua #, Mã hàng, Tên hàng.
                labelSpan={3}
                totals={{ orderedQuantity: totalQuantity }}
              />
            ) : null
          }
        />
      </div>
    </section>
  );
}
