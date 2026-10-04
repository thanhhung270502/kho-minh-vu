"use client";

import { App, Button } from "antd";
import { useRouter } from "next/navigation";

import { errorCode, explainError } from "@/shared/lib/errors";

import { useCreateOrder } from "../hooks/useOrders";

type Props = {
  /** Nhãn nút — trạng thái rỗng dùng câu khác toolbar để rõ đây là bước tiếp theo. */
  label?: string;
};

/**
 * Bấm là tạo ngay một đơn tạm (chưa có người nhận) rồi sang trang đơn — người
 * nhận, dòng hàng, ghi chú điền hết ở đó (0097). Không còn hộp thoại hỏi trước
 * Nội bộ hay Đối tác.
 */
export function CreateOrderButton({ label = "Tạo đơn" }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const createOrder = useCreateOrder();

  async function create() {
    // Nút loading chặn bấm lặp: bấm 5 lần không được ra 5 đơn.
    if (createOrder.isPending) return;
    try {
      const id = await createOrder.mutateAsync({ partnerId: null, staffIds: [] });
      router.push(`/don-dat/${id}`);
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        message.error("Tài khoản không có quyền tạo đơn. Nhờ quản lý hoặc văn phòng.");
        return;
      }
      const explained = explainError(caught);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <Button type="primary" loading={createOrder.isPending} onClick={() => void create()}>
      {label}
    </Button>
  );
}
