"use client";

import { Button } from "antd";
import Link from "next/link";

type Props = {
  /** Nhãn nút — trạng thái rỗng dùng câu khác toolbar để rõ đây là bước tiếp theo. */
  label?: string;
};

/** DON-01: vào thẳng trang tạo đơn, không mở modal. */
export function CreateOrderButton({ label = "Tạo đơn" }: Props) {
  return (
    <Link href="/dat-hang/moi">
      <Button type="primary">{label}</Button>
    </Link>
  );
}
