"use client";

import { Alert } from "antd";

import type { DocumentDetail } from "../types";

/**
 * Bản nháp mở từ "Sửa phiếu" (0124): phiếu cũ đã đảo sổ, nên trong lúc chưa ghi sổ
 * lại thì phiếu này KHÔNG có mặt trong tồn. Nhắc người dùng bấm Ghi sổ.
 */
export function RevisionNotice({ document }: { document: DocumentDetail }) {
  if (document.status !== "NHAP_LIEU" || !document.revisedFromNo) return null;

  return (
    <Alert
      className="mb-4"
      type="warning"
      showIcon
      title={`Đang sửa phiếu đã ghi sổ — bản cũ lưu ở số ${document.revisedFromNo}`}
      description="Sổ kho đã đảo phiếu cũ. Sửa xong bấm Ghi sổ để tồn cập nhật lại; hủy bản nháp này là hủy luôn phiếu."
    />
  );
}
