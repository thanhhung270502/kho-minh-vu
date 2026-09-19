import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ReceiptPrintPage } from "@/features/stock-in/components/receipt-print-page";
import { requirePermission } from "@/features/auth/api/current-user.server";

export const metadata: Metadata = { title: "In phiếu nhập" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Route riêng thay vì ẩn/hiện bằng CSS trên page chi tiết: page chi tiết có
 * ô nhập liệu, in ra sẽ dính cả khung nhập.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  await requirePermission("view-catalog");

  return <ReceiptPrintPage id={id} />;
}
