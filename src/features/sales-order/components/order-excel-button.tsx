"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { App, Button } from "antd";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { downloadFile } from "@/shared/lib/download-file";

import {
  readOrderFilterFromUrl,
  writeOrderFilterToUrl,
} from "../schemas/order.schema";

export function OrderExcelButton() {
  const searchParams = useSearchParams();
  const { message } = App.useApp();
  const [downloading, setDownloading] = useState(false);

  async function run() {
    const filter = readOrderFilterFromUrl(searchParams);
    const query = writeOrderFilterToUrl({ ...filter, page: 1 }).toString();
    setDownloading(true);
    const result = await downloadFile(
      `/api/don-dat/xuat-excel${query ? `?${query}` : ""}`,
      "don-dat.xlsx",
    );
    setDownloading(false);
    if (!result.ok) message.error(result.message);
  }

  return (
    <Button
      icon={<DownloadOutlined />}
      loading={downloading}
      disabled={downloading}
      onClick={() => void run()}
    >
      Xuất Excel
    </Button>
  );
}
