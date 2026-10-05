"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Input, Table, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { downloadBlob } from "@/shared/lib/csv";
import { labelMatches } from "@/shared/lib/text";

import { buildReorderCsv, reorderTabs, suggestedOrder } from "../lib/analysis";
import { FINISH_LABELS, type AnalysisRow, type AnalysisSettings, type FinishType } from "../types";
import { StatusTag, formatQty } from "./status-tag";

type TabKey = "soon" | "outWithDemand" | "later";

/** Bảng "Danh sách cần nhập hàng" — 3 tab, tìm mã; Xuất Excel: mã, tên, số lượng cần nhập. */
export function ReorderTable({ rows, settings }: { rows: AnalysisRow[]; settings: AnalysisSettings }) {
  const [tab, setTab] = useState<TabKey>("soon");
  const [query, setQuery] = useState("");

  const tabs = useMemo(() => reorderTabs(rows, settings), [rows, settings]);

  // Tổng quan dẫn sang bằng /phan-tich#can-nhap; bảng chỉ có sau khi dữ liệu về nên
  // trình duyệt không tự cuộn tới được — cuộn một lần khi bảng xuất hiện.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.location.hash === "#can-nhap") cardRef.current?.scrollIntoView({ block: "start" });
  }, []);
  const filter = (list: AnalysisRow[]) =>
    list.filter((r) => !query.trim() || labelMatches(query, `${r.code} ${r.name}`));

  const columns: ColumnsType<AnalysisRow> = [
    {
      title: "Mã hàng",
      dataIndex: "code",
      width: 150,
      fixed: "left",
      render: (code: string, r) => (
        <Link href={`/danh-muc/${r.productId}`} className="font-mono">
          {code}
        </Link>
      ),
    },
    { title: "Tên hàng", dataIndex: "name", width: 260, ellipsis: true },
    { title: "Loại", dataIndex: "finish", width: 80, render: (f: FinishType) => FINISH_LABELS[f] },
    { title: "Tồn", dataIndex: "stock", width: 80, align: "right", render: (n: number) => formatQty(n) },
    { title: "Đơn đặt", dataIndex: "customerOrdered", width: 90, align: "right", render: (n: number) => formatQty(n) },
    { title: "Bán TB/ngày", dataIndex: "avgDailySales", width: 100, align: "right", render: (n: number | null) => formatQty(n, 2) },
    { title: "Còn (ngày)", dataIndex: "daysOfCover", width: 90, align: "right", render: (n: number | null) => formatQty(n, 1) },
    {
      title: `Đề nghị nhập (${settings.coverDays} ngày)`,
      key: "suggest",
      width: 130,
      align: "right",
      render: (_, r) => <span className="font-semibold">{formatQty(suggestedOrder(r, settings.coverDays))}</span>,
    },
    { title: "Trạng thái", key: "status", width: 130, render: (_, r) => <StatusTag row={r} settings={settings} /> },
  ];

  const table = (list: AnalysisRow[]) => (
    <div className="overflow-x-auto">
      <Table<AnalysisRow>
        rowKey="productId"
        size="small"
        columns={columns}
        dataSource={filter(list)}
        scroll={{ x: 1100 }}
        pagination={{ pageSize: 50, showSizeChanger: false, hideOnSinglePage: true }}
        locale={{ emptyText: "Không có mã nào trong nhóm này." }}
      />
    </div>
  );

  return (
    <Card
      ref={cardRef}
      id="can-nhap"
      size="small"
      className="scroll-mt-28 rounded-xl"
      title="Danh sách cần nhập hàng"
    >
      <div className="mb-3 flex flex-wrap gap-2">
        <Input.Search allowClear placeholder="Mã hoặc tên hàng" className="max-w-xs" onChange={(e) => setQuery(e.target.value)} />
        <Button
          icon={<DownloadOutlined />}
          onClick={() => downloadBlob(buildReorderCsv(rows, settings), "danh-sach-can-nhap.csv")}
        >
          Excel
        </Button>
      </div>
      <Tabs
        activeKey={tab === "later" && settings.yellowDays >= 30 ? "soon" : tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          { key: "soon", label: `Sắp hết ≤ ${settings.yellowDays} ngày (${tabs.soon.length})`, children: table(tabs.soon) },
          { key: "outWithDemand", label: `Đã hết, có khách mua (${tabs.outWithDemand.length})`, children: table(tabs.outWithDemand) },
          // Ngưỡng vàng >= 30: khoảng "X+1–30" rỗng, ẩn tab (không hiện "31–30 ngày").
          ...(settings.yellowDays < 30
            ? [{ key: "later", label: `Còn ${settings.yellowDays + 1}–30 ngày (${tabs.later.length})`, children: table(tabs.later) }]
            : []),
        ]}
      />
    </Card>
  );
}
