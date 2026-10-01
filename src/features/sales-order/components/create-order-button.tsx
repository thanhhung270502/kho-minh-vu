"use client";

import { Alert, Button, DatePicker, Form, Modal } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";
import type { RecipientKind } from "@/shared/lib/recipient";

import { useCreateOrder } from "../hooks/useOrders";
import { RecipientPicker } from "./recipient-picker";

type Props = {
  /** Nhãn nút — trạng thái rỗng dùng câu khác toolbar để rõ đây là bước tiếp theo. */
  label?: string;
};

export function CreateOrderButton({ label = "Tạo đơn" }: Props) {
  const router = useRouter();
  const createOrder = useCreateOrder();

  const [open, setOpen] = useState(false);
  const [recipientKind, setRecipientKind] = useState<RecipientKind>("partner");
  const [recipientId, setRecipientId] = useState<string | undefined>();
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
  const [recipientError, setRecipientError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setRecipientKind("partner");
    setRecipientId(undefined);
    setDeliveryDate(null);
    setRecipientError(null);
    setError(null);
  }

  function close() {
    if (createOrder.isPending) return;
    setOpen(false);
    reset();
  }

  async function create() {
    if (!recipientId) {
      setRecipientError(
        recipientKind === "partner"
          ? "Chọn người nhận trước khi tạo đơn"
          : "Chọn nhân viên nhận hàng trước khi tạo đơn",
      );
      return;
    }
    setRecipientError(null);
    setError(null);

    try {
      const id = await createOrder.mutateAsync({
        recipient: { kind: recipientKind, id: recipientId },
        deliveryDate,
      });
      setOpen(false);
      reset();
      // Tạo đơn là sinh ngay một đơn có số trên server — không giữ đơn nháp
      // ở client, giống khuôn createReceipt của Phase 3.
      router.push(`/dat-hang/${id}`);
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("Tài khoản không có quyền tạo đơn.");
        return;
      }
      // RPC/ràng buộc database đã soạn sẵn câu tiếng Việt — hiện nguyên văn.
      if (isPostgrestError(caught) && caught.code === "23514") {
        setError(caught.message);
        return;
      }
      const explained = explainError(caught);
      setError(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Modal
        open={open}
        title="Tạo đơn đặt hàng"
        okText="Tạo đơn"
        cancelText="Hủy"
        confirmLoading={createOrder.isPending}
        mask={{ closable: false }}
        onOk={() => void create()}
        onCancel={close}
      >
        {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Bấm Tạo là đơn được cấp số ngay trên server — sửa dòng và duyệt đơn ở trang chi tiết."
        />

        <Form layout="vertical">
          <Form.Item
            label="Người nhận"
            validateStatus={recipientError ? "error" : undefined}
            help={recipientError}
          >
            <RecipientPicker
              autoFocus
              kind={recipientKind}
              id={recipientId}
              onKindChange={(kind) => {
                setRecipientKind(kind);
                setRecipientId(undefined);
                setRecipientError(null);
              }}
              onIdChange={(id) => {
                setRecipientId(id);
                setRecipientError(null);
              }}
            />
          </Form.Item>

          <Form.Item label="Ngày giao dự kiến (không bắt buộc)">
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={deliveryDate ? dayjs(deliveryDate) : null}
              onChange={(date) =>
                setDeliveryDate(date ? date.format("YYYY-MM-DD") : null)
              }
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
