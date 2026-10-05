"use client";

import { App, Button } from "antd";
import { useRouter } from "next/navigation";

import { useLookups } from "@/features/products/hooks/useProducts";
import { errorCode, explainError } from "@/shared/lib/errors";

import { useCreateReceipt } from "../hooks/useReceipts";

type Props = {
  /** Nhãn nút — trạng thái rỗng dùng câu khác toolbar để rõ đây là bước tiếp theo. */
  label?: string;
};

/**
 * Bấm là tạo ngay một phiếu nhập nháp (nguồn NCC, kho đầu tiên, chưa có nhà cung
 * cấp) rồi sang trang phiếu — nhà cung cấp, kho, ngày, dòng hàng điền hết ở đó,
 * giống "Tạo đơn". Không còn hộp thoại hỏi trước.
 */
export function CreateReceiptButton({ label = "Tạo phiếu nhập" }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const createReceipt = useCreateReceipt();
  const lookups = useLookups();
  const firstWarehouse = lookups.data?.warehouses[0];

  async function create() {
    // Nút loading chặn bấm lặp: bấm 5 lần không được ra 5 phiếu.
    if (createReceipt.isPending) return;
    if (!firstWarehouse) {
      message.error("Chưa có kho nào — thêm kho trong Cài đặt trước khi tạo phiếu nhập.");
      return;
    }
    try {
      const id = await createReceipt.mutateAsync({
        partnerId: null,
        warehouseId: firstWarehouse.id,
        source: "NCC",
      });
      router.push(`/nhap-kho/${id}`);
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        message.error("Tài khoản không có quyền tạo phiếu nhập. Nhờ quản lý cấp quyền Nhập kho.");
        return;
      }
      const explained = explainError(caught);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <Button
      type="primary"
      loading={createReceipt.isPending || lookups.isPending}
      onClick={() => void create()}
    >
      {label}
    </Button>
  );
}
