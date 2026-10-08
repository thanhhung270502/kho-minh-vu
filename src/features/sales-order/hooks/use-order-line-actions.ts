"use client";

import { App } from "antd";

import { explainError } from "@/shared/lib/errors";
import type { StaffRef } from "@/shared/lib/recipient";

import type { OrderLineInput } from "../schemas/order.schema";
import {
  useAddOrderLine,
  useDeleteOrderLine,
  useUpdateOrderLine,
} from "./useOrders";

/**
 * Gom thao tác dòng đơn kèm thông báo lỗi để `order-line-table.tsx` gọn.
 * Gán người ngoài đơn cho dòng thì DB tự thêm người đó vào đơn (D1) — hook chỉ báo.
 */
export function useOrderLineActions(orderId: string, staff: StaffRef[]) {
  const { message } = App.useApp();
  const add = useAddOrderLine(orderId);
  const update = useUpdateOrderLine(orderId);
  const remove = useDeleteOrderLine(orderId);

  function fail(error: unknown) {
    const explained = explainError(error);
    message.error(`${explained.title}. ${explained.action}`);
  }

  function noticeAutoAdded(recipientId: string | null | undefined, name?: string) {
    if (recipientId && !staff.some((person) => person.id === recipientId)) {
      message.info(`Đã thêm ${name ?? "người này"} vào người nhận của đơn.`);
    }
  }

  async function addLine(line: OrderLineInput, productCode?: string): Promise<boolean> {
    try {
      const result = await add.mutateAsync(line);
      if (result.merged) {
        message.info(
          `Đã cộng thêm ${line.quantity.toLocaleString("vi-VN")} vào dòng ${productCode ?? "đã có"} — nay ${result.quantity.toLocaleString("vi-VN")}.`,
        );
      }
    } catch (error) {
      fail(error);
      return false;
    }
    noticeAutoAdded(line.recipientId);
    return true;
  }

  async function editQuantity(id: string, quantity: number) {
    try {
      await update.mutateAsync({ id, values: { quantity } });
    } catch (error) {
      fail(error);
    }
  }

  async function editNote(id: string, note: string) {
    try {
      await update.mutateAsync({ id, values: { note } });
    } catch (error) {
      fail(error);
    }
  }

  async function editRecipient(
    id: string,
    recipientId: string | null,
    recipientName: string | undefined,
  ) {
    try {
      await update.mutateAsync({ id, values: { recipientId } });
    } catch (error) {
      fail(error);
      return;
    }
    noticeAutoAdded(recipientId, recipientName);
  }

  async function removeLine(id: string) {
    try {
      await remove.mutateAsync(id);
    } catch (error) {
      fail(error);
    }
  }

  return { addLine, editQuantity, editNote, editRecipient, removeLine, adding: add.isPending };
}
