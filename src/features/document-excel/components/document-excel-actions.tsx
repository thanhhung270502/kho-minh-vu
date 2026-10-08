"use client";

import type { ReactNode } from "react";

import { ExcelActions } from "@/shared/components/excel-actions";
import type { ExcelImportCopy } from "@/shared/components/excel-import-dialog";

import { KIND_LABELS, type DocumentKind } from "../lib/document-excel";

type Props = {
  kind: DocumentKind;
  /** Có quyền tạo chứng từ loại này — ẩn "Nhập mới" / "Cập nhật" nếu không. */
  canImport: boolean;
  /** Nút xuất riêng của trang (Đơn đặt). Không truyền: hóa đơn / phiếu nhập dùng nút xuất chung. */
  exportButton?: ReactNode;
};

/** Cụm nút Excel của Đơn đặt / Duyệt đơn / Nhập kho — khuôn chung `ExcelActions`. */
export function DocumentExcelActions({ kind, canImport, exportButton }: Props) {
  const label = KIND_LABELS[kind].one;
  const copy: ExcelImportCopy = {
    label,
    hint: {
      moi: `Mỗi số phiếu thành một ${label} nháp — chưa đụng tồn, kiểm lại trên web rồi mới ghi sổ.`,
      cap_nhat: `Sửa thông tin không ảnh hưởng tồn (người nhận, ghi chú, lý do xuất âm…) của mọi ${label}, kể cả đã ghi sổ. Mã hàng, số lượng, kho, ngày phải giữ nguyên. Ô trống = giữ nguyên. Lấy file bằng “Tải mẫu cập nhật” ở nút ⋯ — file có sẵn các phiếu đang lọc.`,
    },
    createdSuffix: "nháp",
    doneNote: "Mở từng phiếu để kiểm lại rồi ghi sổ.",
  };

  return (
    <ExcelActions
      apiBase={`/api/chung-tu-excel/${kind}`}
      fileStem={KIND_LABELS[kind].file}
      canImport={canImport}
      copy={copy}
      exportButton={exportButton}
    />
  );
}
