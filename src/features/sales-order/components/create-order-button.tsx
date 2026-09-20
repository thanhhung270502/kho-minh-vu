"use client";

import { Alert, Button, DatePicker, Form, Modal } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PartnerSearchInput } from "@/shared/components/partner-search-input";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useCreateOrder } from "../hooks/useOrders";

type Props = {
  /** Nhãn nút — trạng thái rỗng dùng câu khác toolbar để rõ đây là bước tiếp theo. */
  label?: string;
};

export function CreateOrderButton({ label = "Tạo đơn" }: Props) {
  const router = useRouter();
  const createOrder = useCreateOrder();

  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string | undefined>();
  const [deliveryDate, setDeliveryDate] = useState<string | null>(null);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPartnerId(undefined);
    setDeliveryDate(null);
    setPartnerError(null);
    setError(null);
  }

  function close() {
    if (createOrder.isPending) return;
    setOpen(false);
    reset();
  }

  async function create() {
    if (!partnerId) {
      setPartnerError("Chọn người nhận trước khi tạo đơn");
      return;
    }
    setPartnerError(null);
    setError(null);

    try {
      const id = await createOrder.mutateAsync({ partnerId, deliveryDate });
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
            validateStatus={partnerError ? "error" : undefined}
            help={partnerError}
          >
            <PartnerSearchInput
              autoFocus
              value={partnerId}
              onChange={(id) => {
                setPartnerId(id);
                setPartnerError(null);
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
