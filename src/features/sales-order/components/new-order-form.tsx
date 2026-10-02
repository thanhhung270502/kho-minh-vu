"use client";

import { Alert, Card, Form, Spin } from "antd";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";
import { DEFAULT_RECIPIENT_KIND, type RecipientKind } from "@/shared/lib/recipient";

import { useCreateOrder } from "../hooks/useOrders";
import { RecipientPicker } from "./recipient-picker";

/**
 * Bấm "Tạo đơn" vào thẳng giao diện tạo đơn (DON-01) — không còn modal.
 * Chọn người nhận là đơn tạm được cấp số ngay trên server rồi sang trang chi
 * tiết, nơi ô mã hàng đã đứng sẵn con trỏ để gõ dòng (useFocusOnOpen). CHECK
 * database cấm đơn không có người nhận, nên người nhận là bước bắt buộc đầu tiên.
 */
export function NewOrderForm() {
  const router = useRouter();
  const createOrder = useCreateOrder();
  const [kind, setKind] = useState<RecipientKind>(DEFAULT_RECIPIENT_KIND);
  const [error, setError] = useState<string | null>(null);

  async function create(recipientId: string | undefined) {
    if (!recipientId || createOrder.isPending) return;
    setError(null);
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
    }
  }

  return (
    <Card className="max-w-xl">
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

      <Link href="/dat-hang" className="text-sm">
        ← Về danh sách đơn
      </Link>
    </Card>
  );
}
