import type { Metadata } from "next";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { ProvisionalStockPreview } from "@/features/inventory/components/provisional-stock-preview";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Nạp tồn tạm" };

export default async function ProvisionalStockPage() {
  // Chỉ quản lý — khớp chặn 42501 trong RPC `nap_ton_tam` và route
  // `/api/ton-kho/nap-tam`. Vai trò khác gõ thẳng URL bị đẩy sang /khong-du-quyen.
  await requirePermission("load-provisional-stock");

  return (
    <>
      <PageHeader
        title="Nạp tồn tạm từ KiotViet"
        description="Số tạm để các màn tồn kho có dữ liệu mà kiểm. Kiểm kê sẽ đè lên bằng phiếu điều chỉnh."
      />

      {/* Không cần Suspense: màn này không đọc `useSearchParams()`. */}
      <ProvisionalStockPreview />
    </>
  );
}
