"use client";

import { FileExcelOutlined } from "@ant-design/icons";
import { App, Button, Dropdown, Space } from "antd";
import type { MenuProps } from "antd";
import { useState, type ReactNode } from "react";

import { downloadFile } from "@/shared/lib/download-file";

import { KIND_LABELS, type DocumentKind, type ImportMode } from "../lib/document-excel";
import { DocumentImportDialog } from "./document-import-dialog";

type Props = {
  kind: DocumentKind;
  /** Có quyền tạo chứng từ loại này — ẩn "Nhập mới" / "Cập nhật" nếu không. */
  canImport: boolean;
  /** Nút xuất sẵn có của trang (Đơn đặt) — ghép chung một cụm với menu. */
  exportButton?: ReactNode;
};

/** Cụm nút Excel đầu trang: nhập mới, tải mẫu nhập mới, cập nhật, tải mẫu cập nhật. */
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
      {exportButton ? (
        // `Dropdown.Button` đã bị antd v6 bỏ — ghép tay đúng khuyến nghị của nó.
        <Space.Compact>
          {exportButton}
          <Dropdown menu={menu}>
            <Button loading={downloading} aria-label="Nhập và file mẫu Excel">⋯</Button>
          </Dropdown>
        </Space.Compact>
      ) : (
        <Dropdown menu={menu}>
          <Button icon={<FileExcelOutlined />} loading={downloading}>
            Excel
          </Button>
        </Dropdown>
      )}
      <DocumentImportDialog kind={kind} mode={mode} onClose={() => setMode(null)} />
    </>
  );
}
