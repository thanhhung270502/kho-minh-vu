"use client";

import { App, Button, Dropdown, Space } from "antd";
import type { MenuProps } from "antd";
import { useState, type ReactNode } from "react";

import { downloadFile } from "@/shared/lib/download-file";

import { KIND_LABELS, type DocumentKind, type ImportMode } from "../lib/document-excel";
import { DocumentExportButton } from "./document-export-button";
import { DocumentImportDialog } from "./document-import-dialog";

type Props = {
  kind: DocumentKind;
  /** Có quyền tạo chứng từ loại này — ẩn "Nhập mới" / "Cập nhật" nếu không. */
  canImport: boolean;
  /** Nút xuất riêng của trang (Đơn đặt). Không truyền: hóa đơn / phiếu nhập dùng nút xuất chung. */
  exportButton?: ReactNode;
};

/**
 * Cụm nút Excel trên thanh công cụ của bảng: [Excel] xuất các phiếu đang lọc, [⋯]
 * nhập mới, tải mẫu nhập mới, cập nhật, tải mẫu cập nhật. Ba màn dùng chung một kiểu.
 */
export function DocumentExcelActions({ kind, canImport, exportButton }: Props) {
  const { message } = App.useApp();
  const [mode, setMode] = useState<ImportMode | null>(null);
  const [downloading, setDownloading] = useState(false);
  const file = KIND_LABELS[kind].file;

  async function download(kieu: ImportMode) {
    setDownloading(true);
    const result = await downloadFile(`/api/chung-tu-excel/${kind}/mau?kieu=${kieu}`, `mau-${file}.xlsx`);
    setDownloading(false);
    if (!result.ok) message.error(result.message);
  }

  const items: MenuProps["items"] = [
    ...(canImport ? [{ key: "import-new", label: "Nhập mới…" }] : []),
    { key: "template-new", label: "Tải mẫu nhập mới" },
    { type: "divider" as const },
    ...(canImport ? [{ key: "import-update", label: "Cập nhật…" }] : []),
    { key: "template-update", label: "Tải mẫu cập nhật" },
  ];

  const menu: MenuProps = {
    items,
    onClick: ({ key }) => {
      if (key === "import-new") setMode("moi");
      if (key === "import-update") setMode("cap_nhat");
      if (key === "template-new") void download("moi");
      if (key === "template-update") void download("cap_nhat");
    },
  };

  return (
    <>
      {/* `Dropdown.Button` đã bị antd v6 bỏ — ghép tay đúng khuyến nghị của nó. */}
      <Space.Compact>
        {exportButton ?? (kind === "don-dat" ? null : <DocumentExportButton kind={kind} />)}
        <Dropdown menu={menu}>
          <Button loading={downloading} aria-label="Nhập Excel và file mẫu">⋯</Button>
        </Dropdown>
      </Space.Compact>
      <DocumentImportDialog kind={kind} mode={mode} onClose={() => setMode(null)} />
    </>
  );
}
