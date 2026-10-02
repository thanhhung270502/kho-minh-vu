"use client";

import { App, Button, Dropdown, Space } from "antd";
import { useState } from "react";

import { writeFilterToUrl, type ProductFilter } from "../schemas/filter.schema";

type Props = {
  filter: ProductFilter;
  productCount: number;
  /** Chỉ truyền khi người dùng có quyền sửa. */
  onOpenImport?: (kind: ImportKind) => void;
};

/** "new" = nhập mã mới từ file 4 cột (Phase 15); "update" = cập nhật mã đã có (mẫu 12 cột / KiotViet). */
export type ImportKind = "new" | "update";

type DownloadResult = { ok: true } | { ok: false; message: string };

/** Tải một file từ route trả blob; lỗi thì đọc JSON để hiện câu tiếng Việt. */
async function downloadFile(url: string): Promise<DownloadResult> {
  const response = await fetch(url);

  if (!response.ok) {
    try {
      const body = (await response.json()) as { title?: string; action?: string };
      return {
        ok: false,
        message: `${body.title ?? "Không tải được file"}. ${body.action ?? ""}`,
      };
    } catch {
      return { ok: false, message: "Không tải được file. Thử lại sau ít phút." };
    }
  }

  const blob = await response.blob();
  const fileName =
    /filename="([^"]+)"/.exec(response.headers.get("Content-Disposition") ?? "")?.[1] ??
    "danh-muc.xlsx";

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Thu hồi ngay sau khi trình duyệt nhận lệnh tải, không giữ blob trong bộ nhớ.
  URL.revokeObjectURL(objectUrl);

  return { ok: true };
}

export function ExcelButton({
  filter,
  productCount,
  onOpenImport,
}: Props) {
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState(false);

  async function run(url: string) {
    setDownloading(true);
    const result = await downloadFile(url);
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
