"use client";

import { App, Button, Dropdown, Space } from "antd";
import type { MenuProps } from "antd";
import { useSearchParams } from "next/navigation";
import { useState, type ReactNode } from "react";

import { downloadFile } from "@/shared/lib/download-file";
import type { ExcelImportMode } from "@/shared/lib/excel-import";

import { ExcelExportButton } from "./excel-export-button";
import { ExcelImportDialog, type ExcelImportCopy } from "./excel-import-dialog";

type Props = {
  /**
   * Gốc các route Excel: `${apiBase}/xuat` (xuất), `${apiBase}/mau?kieu=` (file mẫu),
   * `${apiBase}/nhap` (nhập).
   */
  apiBase: string;
  /** Tên file tải về (không đuôi): "phieu-nhap", "doi-tac"… */
  fileStem: string;
  /** Có quyền ghi — ẩn "Nhập mới" / "Cập nhật" nếu không. */
  canImport: boolean;
  copy: ExcelImportCopy;
  /** Nút xuất riêng của màn (Đơn đặt). Không truyền: dùng `${apiBase}/xuat`. */
  exportButton?: ReactNode;
};

/**
 * Cụm nút Excel trên thanh công cụ của bảng: [Excel] xuất các bản ghi đang lọc, [⋯]
 * nhập mới, tải mẫu nhập mới, cập nhật, tải mẫu cập nhật. Mọi màn danh sách dùng chung.
 */
export function ExcelActions({ apiBase, fileStem, canImport, copy, exportButton }: Props) {
  const { message } = App.useApp();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<ExcelImportMode | null>(null);
  const [downloading, setDownloading] = useState(false);

  async function download(kieu: ExcelImportMode) {
    setDownloading(true);
    // Mẫu cập nhật = các bản ghi đang lọc trên màn hình, đủ thông tin: gửi kèm bộ lọc.
    const params = kieu === "cap_nhat" ? new URLSearchParams(searchParams.toString()) : new URLSearchParams();
    params.delete("trang");
    params.delete("chon");
    params.set("kieu", kieu);
    const result = await downloadFile(`${apiBase}/mau?${params.toString()}`, `mau-${fileStem}.xlsx`);
    setDownloading(false);
    if (!result.ok) message.error(result.message);
  }

  const menu: MenuProps = {
    items: [
      ...(canImport ? [{ key: "import-new", label: "Nhập mới…" }] : []),
      { key: "template-new", label: "Tải mẫu nhập mới" },
      { type: "divider" as const },
      ...(canImport ? [{ key: "import-update", label: "Cập nhật…" }] : []),
      { key: "template-update", label: "Tải mẫu cập nhật" },
    ],
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
        {exportButton ?? (
          <ExcelExportButton
            href={`${apiBase}/xuat`}
            fileName={`${fileStem}.xlsx`}
            title={`Xuất Excel các ${copy.label} đang lọc`}
          />
        )}
        <Dropdown menu={menu}>
          <Button loading={downloading} aria-label="Nhập Excel và file mẫu">⋯</Button>
        </Dropdown>
      </Space.Compact>
      <ExcelImportDialog
        endpoint={`${apiBase}/nhap`}
        templateHref={`${apiBase}/mau?kieu=moi`}
        fileStem={fileStem}
        copy={copy}
        mode={mode}
        onClose={() => setMode(null)}
      />
    </>
  );
}
