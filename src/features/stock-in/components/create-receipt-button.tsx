"use client";

import { App, Button } from "antd";
import { useRouter } from "next/navigation";

import { useLookups } from "@/features/products/hooks/useProducts";
import { errorCode, explainError } from "@/shared/lib/errors";

import { DEFAULT_SUPPLIER_CODE, findActivePartnerId } from "../api/receipt.api";
import { useCreateReceipt } from "../hooks/useReceipts";

type Props = {
  /** Nhãn nút — trạng thái rỗng dùng câu khác toolbar để rõ đây là bước tiếp theo. */
  label?: string;
};

/**
 * Bấm là tạo ngay một phiếu nhập nháp rồi sang trang phiếu, giống "Tạo đơn". Mặc
 * định Kho 1 và nhà cung cấp NCC000001 (nhà máy Vũ Trụ — phần lớn hàng về từ đây);
 * cả hai đổi được trong khung Thông tin phiếu.
 */
export function CreateReceiptButton({ label = "Tạo phiếu nhập" }: Props) {
  const router = useRouter();
  const { message } = App.useApp();
  const createReceipt = useCreateReceipt();
  const lookups = useLookups();
  const warehouses = lookups.data?.warehouses ?? [];
  const defaultWarehouse = warehouses.find((w) => w.name.trim().toLowerCase() === "kho 1") ?? warehouses[0];

  async function create() {
    // Nút loading chặn bấm lặp: bấm 5 lần không được ra 5 phiếu.
    if (createReceipt.isPending) return;
    if (!defaultWarehouse) {
      message.error("Chưa có kho nào — thêm kho trong Cài đặt trước khi tạo phiếu nhập.");
      return;
    }
    try {
      // NCC mặc định ngừng hoạt động / chưa có thì tạo phiếu chưa có NCC — chọn trong trang.
      const partnerId = await findActivePartnerId(DEFAULT_SUPPLIER_CODE);
      const id = await createReceipt.mutateAsync({
        partnerId,
        warehouseId: defaultWarehouse.id,
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
