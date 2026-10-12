import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { StocktakePrintPage } from "@/features/stocktake/components/stocktake-print-page";

export const metadata: Metadata = { title: "In phiếu kiểm kho" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Phiếu giấy đi đếm (0129). Route riêng như phiếu nhập: trang chi tiết có ô nhập
 * liệu, in ra sẽ dính cả khung nhập. Cùng quyền xem với trang chi tiết phiên.
 */
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  await requirePermission("view-catalog");

  return <StocktakePrintPage id={id} />;
}
