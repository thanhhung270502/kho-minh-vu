"use client";

import { Card } from "antd";

import { NewOrderForm } from "./new-order-form";

/** Card bọc form tạo đơn cho trang /dat-hang/moi — antd không render được từ Server Component (bẫy 1). */
export function NewOrderCard() {
  return (
    <Card className="mb-3 max-w-xl">
      <NewOrderForm />
    </Card>
  );
}
