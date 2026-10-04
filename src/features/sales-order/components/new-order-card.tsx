"use client";

import { Card } from "antd";

import { CreateOrderButton } from "./create-order-button";

/** Trang /don-dat/moi (giữ cho link cũ) — antd không render được từ Server Component (bẫy 1). */
export function NewOrderCard() {
  return (
    <Card className="mb-3 max-w-xl">
      <p className="mb-3 text-sm text-gray-500">
        Bấm Tạo đơn là có ngay đơn tạm. Người nhận, dòng hàng và ghi chú điền trong trang đơn.
      </p>
      <CreateOrderButton />
    </Card>
  );
}
