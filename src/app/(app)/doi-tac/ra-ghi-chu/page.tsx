import type { Metadata } from "next";
import Link from "next/link";

import { NoteReview } from "@/features/partners/components/note-review";
import { requirePermission } from "@/features/auth/api/current-user.server";
import { PageHeader } from "@/shared/components/page-header";

export const metadata: Metadata = { title: "Rà ghi chú KiotViet" };

export default async function NoteReviewPage() {
  await requirePermission("edit-catalog");

  return (
    <>
      <Link href="/doi-tac" className="mb-2 inline-block text-sm">
        ← Đối tác
      </Link>

      <PageHeader
        title="Rà ghi chú KiotViet"
        description="Biến tên trong ô Ghi chú hóa đơn cũ thành khách hàng thật. Hệ thống không tự đoán — bạn quyết từng giá trị."
      />

      <NoteReview />
    </>
  );
}
