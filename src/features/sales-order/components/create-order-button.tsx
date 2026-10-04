"use client";

import { Button, Modal } from "antd";
import { useState } from "react";

import { NewOrderForm } from "./new-order-form";

type Props = {
  /** Nhãn nút — trạng thái rỗng dùng câu khác toolbar để rõ đây là bước tiếp theo. */
  label?: string;
};

/**
 * Mở dialog chọn người nhận ngay trên danh sách — bấm "Tạo" là đơn tạm được
 * tạo và chuyển sang trang chi tiết để gõ dòng.
 */
export function CreateOrderButton({ label = "Tạo đơn" }: Props) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  function close() {
    // Đang tạo đơn thì không cho đóng — đóng giữa chừng vẫn ra đơn nhưng người dùng tưởng đã hủy.
    if (pending) return;
    setOpen(false);
  }

  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        {label}
      </Button>
      <Modal
        title="Tạo đơn đặt"
        open={open}
        onCancel={close}
        footer={null}
        mask={{ closable: !pending }}
        keyboard={!pending}
        closable={!pending}
        destroyOnHidden
      >
        <p className="mb-3 text-sm text-gray-500">Chọn nhân viên nhận hàng. Giao cho khách thì gõ tên khách — chưa có thì thêm ngay.</p>
        <NewOrderForm onPendingChange={setPending} onCancel={close} />
      </Modal>
    </>
  );
}
