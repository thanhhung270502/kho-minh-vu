"use client";

import { FileExcelOutlined } from "@ant-design/icons";
import { App, Button } from "antd";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { downloadFile } from "@/shared/lib/download-file";

type Props = {
  /** Route GET trả file — nhận nguyên tham số lọc URL của màn danh sách. */
  href: string;
  fileName: string;
  title: string;
};

/** Nút [Excel]: xuất các bản ghi đang lọc trên màn danh sách (bỏ phân trang). */
export function ExcelExportButton({ href, fileName, title }: Props) {
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState(false);

  async function run() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("trang");
    params.delete("chon");
    const query = params.toString();
    setDownloading(true);
    const result = await downloadFile(`${href}${query ? `?${query}` : ""}`, fileName);
    setDownloading(false);
    if (!result.ok) message.error(result.message);
  }

  return (
    <Button
      icon={<FileExcelOutlined />}
      title={title}
      loading={downloading}
      disabled={downloading}
      onClick={() => void run()}
    >
      Excel
    </Button>
  );
}
