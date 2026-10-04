"use client";

import { App, Button, Dropdown, Space } from "antd";
import { useState } from "react";

import { downloadFile } from "@/shared/lib/download-file";

import { writeFilterToUrl, type ProductFilter } from "../schemas/filter.schema";

type Props = {
  filter: ProductFilter;
  productCount: number;
  /** Chỉ truyền khi người dùng có quyền sửa. */
  onOpenImport?: (kind: ImportKind) => void;
};

/** "new" = nhập mã mới từ file 4 cột (Phase 15); "update" = cập nhật mã đã có (mẫu 12 cột / KiotViet). */
export type ImportKind = "new" | "update";

export function ExcelButton({
  filter,
  productCount,
  onOpenImport,
}: Props) {
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState(false);

  async function run(url: string) {
    setDownloading(true);
    const result = await downloadFile(url, "danh-muc.xlsx");
    setDownloading(false);
    if (!result.ok) message.error(result.message);
  }

  return (
    // `Dropdown.Button` đã bị antd v6 bỏ — ghép tay đúng khuyến nghị của nó.
    <Space.Compact>
      <Button
        loading={downloading}
        title={`Xuất ${productCount.toLocaleString("vi-VN")} mã đang lọc`}
        onClick={() =>
          void run(`/api/danh-muc/xuat-excel?${writeFilterToUrl(filter)}`)
        }
      >
        Xuất Excel
      </Button>
      <Dropdown
        menu={{
          items: [
            ...(onOpenImport ? [{ key: "import-new", label: "Nhập mã hàng mới…" }] : []),
            { key: "template-new", label: "Tải file mẫu nhập mã mới" },
            { type: "divider" as const },
            ...(onOpenImport ? [{ key: "import-update", label: "Cập nhật từ Excel…" }] : []),
            { key: "template", label: "Tải file mẫu cập nhật" },
          ],
          onClick: ({ key }) => {
            if (key === "template") void run("/api/danh-muc/mau-excel");
            if (key === "template-new") void run("/api/danh-muc/mau-nhap-moi");
            if (key === "import-new") onOpenImport?.("new");
            if (key === "import-update") onOpenImport?.("update");
          },
        }}
      >
        <Button aria-label="Thêm lựa chọn Excel">⋯</Button>
      </Dropdown>
    </Space.Compact>
  );
}
