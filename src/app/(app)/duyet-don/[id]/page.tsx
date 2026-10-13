import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { IssueDetailView } from "@/features/stock-out/components/issue-detail";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { can, isAdmin } from "@/shared/lib/permissions";

export const metadata: Metadata = { title: "Duyệt đơn" };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  // Next 16: `params` là Promise, phải await trước khi đọc.
  const { id } = await params;
  if (!UUID.test(id)) notFound();

  const user = await requirePermission("view-catalog");

  return (
    <IssueDetailView
      id={id}
      permissions={{
        // 0130: lập / sửa / duyệt hóa đơn theo quyền Xác nhận / duyệt đơn (chặn thật ở RLS + RPC).
            canEdit: can(user, "xac_nhan_don"),
        // D-06: chỉ quản lý hủy phiếu đã ghi sổ. Chặn thật ở database (0046).
        // Hủy hóa đơn đã ghi sổ = quyền "Sửa hóa đơn" (huy_chung_tu, 0083).
        canVoid: isAdmin(user),
            canReopen: can(user, "sua_phieu"),
      }}
    />
  );
}
