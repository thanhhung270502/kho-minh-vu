"use client";

import { FileExcelOutlined } from "@ant-design/icons";
import { App, Button } from "antd";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { downloadFile } from "@/shared/lib/download-file";

import { KIND_LABELS } from "../lib/document-excel";

/** Xuất hóa đơn / phiếu nhập đang lọc — gửi nguyên tham số URL của màn danh sách. */
export function DocumentExportButton({ kind }: { kind: "hoa-don" | "phieu-nhap" }) {
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState(false);

  async function run() {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("trang");
    const query = params.toString();
    setDownloading(true);
    const result = await downloadFile(
      `/api/chung-tu-excel/${kind}/xuat${query ? `?${query}` : ""}`,
      `${KIND_LABELS[kind].file}.xlsx`,
    );
    setDownloading(false);
    if (!result.ok) message.error(result.message);
  }

  return (
    <Button
      icon={<FileExcelOutlined />}
      title={`Xuất Excel các ${KIND_LABELS[kind].one} đang lọc`}
      loading={downloading}
      disabled={downloading}
      onClick={() => void run()}
    >
      Excel
    </Button>
  );
}
