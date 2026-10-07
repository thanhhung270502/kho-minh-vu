"use client";

import { DownloadOutlined } from "@ant-design/icons";
import { Button, Card, Input, Table, Tabs } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { downloadBlob } from "@/shared/lib/csv";
import { labelMatches } from "@/shared/lib/text";

import { buildReorderCsv, reorderTabs, suggestedOrder } from "../lib/analysis";
import {
  FINISH_LABELS,
  type AnalysisRow,
  type AnalysisSettings,
  type FinishType,
} from "../types";
import { StatusTag, formatQty } from "./status-tag";

type TabKey = "urgent" | "soon" | "outWithDemand";

/** Bảng "Danh sách cần nhập hàng" — tab theo trạng thái định mức, tìm mã; Xuất Excel: mã, tên, số lượng cần nhập. */
export function ReorderTable({
  rows,
  settings,
}: {
  rows: AnalysisRow[];
  settings: AnalysisSettings;
}) {
  const [tab, setTab] = useState<TabKey>("urgent");
  const [query, setQuery] = useState("");

  const tabs = useMemo(() => reorderTabs(rows, settings), [rows, settings]);

  // Tổng quan dẫn sang bằng /phan-tich#can-nhap; bảng chỉ có sau khi dữ liệu về nên
  // trình duyệt không tự cuộn tới được — cuộn một lần khi bảng xuất hiện.
  const cardRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (window.location.hash === "#can-nhap")
      cardRef.current?.scrollIntoView({ block: "start" });
  }, []);
  const filter = (list: AnalysisRow[]) =>
    list.filter(
      (r) => !query.trim() || labelMatches(query, `${r.code} ${r.name}`),
    );

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
    {
      title: "Loại",
      dataIndex: "finish",
      width: 80,
      render: (f: FinishType) => FINISH_LABELS[f],
    },
    {
      title: "Tồn",
      dataIndex: "stock",
      width: 80,
      align: "right",
      render: (n: number) => formatQty(n),
    },
    {
      title: "Đơn đặt",
      dataIndex: "customerOrdered",
      width: 90,
      align: "right",
      render: (n: number) => formatQty(n),
    },
    {
      title: "Định mức",
      dataIndex: "minStock",
      width: 90,
      align: "right",
      render: (n: number) => (n > 0 ? formatQty(n) : "—"),
    },
    {
      title: "Xuất TB/ngày",
      dataIndex: "avgDailySales",
      width: 100,
      align: "right",
      render: (n: number | null) => formatQty(n, 2),
    },
    {
      title: "Còn (ngày)",
      dataIndex: "daysOfCover",
      width: 90,
      align: "right",
      render: (n: number | null) => formatQty(n, 1),
    },
    {
      title: `Đề nghị nhập (${settings.coverDays} ngày)`,
      key: "suggest",
      width: 170,
      align: "right",
      render: (_, r) => (
        <span className="font-semibold">
          {formatQty(suggestedOrder(r, settings.coverDays))}
        </span>
      ),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 140,
      render: (_, r) => <StatusTag row={r} settings={settings} />,
    },
  ];

  // scroll.x = tổng độ rộng các cột — nhỏ hơn thì cột cuối đè lên cột kề bên.
  const table = (list: AnalysisRow[]) => (
    <Table<AnalysisRow>
      rowKey="productId"
      size="small"
      columns={columns}
      dataSource={filter(list)}
      scroll={{ x: 1250 }}
      pagination={{
        pageSize: 50,
        showSizeChanger: false,
        hideOnSinglePage: true,
      }}
      locale={{ emptyText: "Không có mã nào trong nhóm này." }}
    />
  );

  return (
    <Card
      ref={cardRef}
      id="can-nhap"
      size="small"
      className="scroll-mt-28 rounded-xl"
      title="Danh sách cần nhập hàng"
      extra={
        <div className="flex items-center gap-2">
          <Input.Search
            allowClear
            size="small"
            className="w-56"
            placeholder="Tìm mã hoặc tên"
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={() =>
              downloadBlob(
                buildReorderCsv(rows, settings),
                "danh-sach-can-nhap.csv",
              )
            }
          >
            Xuất Excel
          </Button>
        </div>
      }
    >
      <Tabs
        activeKey={tab}
        onChange={(k) => setTab(k as TabKey)}
        items={[
          {
            key: "urgent",
            label: `Dưới định mức (${tabs.urgent.length})`,
            children: table(tabs.urgent),
          },
          {
            key: "soon",
            label: `Nên nhập (${tabs.soon.length})`,
            children: table(tabs.soon),
          },
          {
            key: "outWithDemand",
            label: `Đã hết, có khách mua (${tabs.outWithDemand.length})`,
            children: table(tabs.outWithDemand),
          },
        ]}
      />
    </Card>
  );
}
