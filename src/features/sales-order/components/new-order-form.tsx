"use client";

import { Alert, Form, Spin } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";
import { DEFAULT_RECIPIENT_KIND, type RecipientKind } from "@/shared/lib/recipient";

import { useCreateOrder } from "../hooks/useOrders";
import { RecipientPicker } from "./recipient-picker";

type Props = {
  /** Báo cha khi đang tạo đơn — dialog dùng để chặn đóng giữa chừng. */
  onPendingChange?: (pending: boolean) => void;
};

/**
 * Phần ruột tạo đơn (DON-01), dùng chung cho dialog trên /dat-hang và trang
 * /dat-hang/moi (giữ cho link cũ). Chọn người nhận là đơn tạm được cấp số ngay trên server rồi sang trang chi
 * tiết, nơi ô mã hàng đã đứng sẵn con trỏ để gõ dòng (useFocusOnOpen). CHECK
 * database cấm đơn không có người nhận, nên người nhận là bước bắt buộc đầu tiên.
 */
export function NewOrderForm({ onPendingChange }: Props) {
  const router = useRouter();
  const createOrder = useCreateOrder();
  const [kind, setKind] = useState<RecipientKind>(DEFAULT_RECIPIENT_KIND);
  const [error, setError] = useState<string | null>(null);

  async function create(recipientId: string | undefined) {
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

      <Spin spinning={createOrder.isPending} description="Đang tạo đơn…">
        <Form layout="vertical">
          <Form.Item
            label="Người nhận"
            help="Chọn xong là tạo đơn tạm và chuyển sang gõ dòng hàng. Ngày giao, ghi chú sửa ở đầu đơn."
          >
            <RecipientPicker
              autoFocus
              kind={kind}
              id={undefined}
              onKindChange={(next) => {
                setKind(next);
                setError(null);
              }}
              onIdChange={(id) => void create(id)}
            />
          </Form.Item>
        </Form>
      </Spin>
    </>
  );
}
