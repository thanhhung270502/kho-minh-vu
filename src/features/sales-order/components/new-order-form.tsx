"use client";

import { Alert, Button, Form } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";
import { DEFAULT_RECIPIENT_KIND, type RecipientKind } from "@/shared/lib/recipient";

import { useCreateOrder } from "../hooks/useOrders";
import { RecipientPicker } from "./recipient-picker";

type Props = {
  /** Báo cha khi đang tạo đơn — dialog dùng để chặn đóng giữa chừng. */
  onPendingChange?: (pending: boolean) => void;
  /** Có thì hiện nút "Hủy" cạnh nút "Tạo" — dialog truyền vào, trang thì không. */
  onCancel?: () => void;
};

/**
 * Phần ruột tạo đơn (DON-01), dùng chung cho dialog trên /dat-hang và trang
 * /dat-hang/moi (giữ cho link cũ). Chọn người nhận rồi bấm "Tạo" mới cấp số
 * đơn tạm trên server rồi sang trang chi tiết, nơi ô mã hàng đã đứng sẵn con
 * trỏ để gõ dòng (useFocusOnOpen). CHECK database cấm đơn không có người nhận,
 * nên nút "Tạo" khóa tới khi đã chọn người nhận.
 */
export function NewOrderForm({ onPendingChange, onCancel }: Props) {
  const router = useRouter();
  const createOrder = useCreateOrder();
  const [kind, setKind] = useState<RecipientKind>(DEFAULT_RECIPIENT_KIND);
  const [recipientId, setRecipientId] = useState<string | undefined>();
  const [error, setError] = useState<string | null>(null);

  async function create() {
    if (!recipientId || createOrder.isPending) return;
    setError(null);
    onPendingChange?.(true);
    try {
      const id = await createOrder.mutateAsync({
        recipient: { kind, id: recipientId },
        deliveryDate: null,
      });
      // replace: nút Back không quay lại trang tạo — đơn đã có số rồi.
      router.replace(`/dat-hang/${id}`);
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("Tài khoản không có quyền tạo đơn. Nhờ quản lý hoặc văn phòng.");
        return;
      }
      if (isPostgrestError(caught) && caught.code === "23514") {
        setError(caught.message);
        return;
      }
      const explained = explainError(caught);
      setError(`${explained.title}. ${explained.action}`);
    } finally {
      onPendingChange?.(false);
    }
  }

  return (
    <>
      {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

      <Form layout="vertical" onFinish={() => void create()} disabled={createOrder.isPending}>
        <Form.Item
          label="Người nhận"
          help="Bấm Tạo là tạo đơn tạm và chuyển sang gõ dòng hàng. Ngày giao, ghi chú sửa ở đầu đơn."
        >
          <RecipientPicker
            autoFocus
            kind={kind}
            id={recipientId}
            onKindChange={(next) => {
              setKind(next);
              // id của chế độ cũ không còn nghĩa (xem RecipientPicker).
              setRecipientId(undefined);
              setError(null);
            }}
            onIdChange={(id) => {
              setRecipientId(id);
              setError(null);
            }}
          />
        </Form.Item>

        <div className="mt-4 flex justify-end gap-2">
          {onCancel ? <Button onClick={onCancel}>Hủy</Button> : null}
          <Button type="primary" htmlType="submit" disabled={!recipientId} loading={createOrder.isPending}>
            Tạo
          </Button>
        </div>
      </Form>
    </>
  );
}
