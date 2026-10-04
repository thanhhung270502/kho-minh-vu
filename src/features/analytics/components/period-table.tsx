"use client";

import { Button, Card, Input, Table, Tag, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { useMemo, useState } from "react";

import { downloadBlob } from "@/shared/lib/csv";
import { labelMatches } from "@/shared/lib/text";

import { buildPeriodCsv, changeRatio, hasActivity, stockOutlook, type StockOutlook } from "../lib/period-analysis";
import type { AnalysisSettings, PeriodRow } from "../types";
import { ChangePill } from "./stat-card";

const qty = (v: number, digits = 0) =>
  v === 0 ? <Typography.Text type="secondary">0</Typography.Text> : v.toLocaleString("vi-VN", { maximumFractionDigits: digits });

const OUTLOOK_TAG: Record<StockOutlook["level"], { color: string }> = {
  out: { color: "red" },
  red: { color: "volcano" },
  yellow: { color: "gold" },
  ok: { color: "green" },
  "no-sales": { color: "default" },
};

type Props = {
  rows: PeriodRow[];
  periodText: string;
  /** Số ngày của kỳ — chia ra xuất TB/ngày. */
  days: number;
  settings: AnalysisSettings;
};

/**
 * Xuất – Nhập – Tồn theo mã: mã, tên, nhập, xuất, tồn cuối kỳ, xuất kỳ trước (+ %),
 * xuất TB/ngày, trạng thái (còn bao nhiêu ngày hàng). Mặc định xếp theo xuất giảm dần,
 * ẩn mã không phát sinh và không còn tồn.
 */
export function PeriodTable({ rows, periodText, days, settings }: Props) {
  const [query, setQuery] = useState("");

  const visible = useMemo(
    () => rows.filter((r) => hasActivity(r) && (!query.trim() || labelMatches(query, `${r.code} ${r.name}`))),
    [rows, query],
  );

  const columns: TableColumnsType<PeriodRow> = [
    { title: "Mã hàng", dataIndex: "code", key: "code", width: 150, fixed: "left", render: (c: string) => <span className="font-mono">{c}</span> },
    { title: "Tên hàng", dataIndex: "name", key: "name", width: 260, ellipsis: true },
    { title: "Nhập", dataIndex: "received", key: "received", width: 90, align: "right", sorter: (a, b) => a.received - b.received, render: (v: number) => qty(v) },
    {
      title: "Xuất",
      dataIndex: "sold",
      key: "sold",
      width: 90,
      align: "right",
      defaultSortOrder: "descend",
      sorter: (a, b) => a.sold - b.sold,
      render: (v: number) => qty(v),
    },
    { title: "Tồn", dataIndex: "closingStock", key: "closingStock", width: 90, align: "right", sorter: (a, b) => a.closingStock - b.closingStock, render: (v: number) => qty(v) },
    {
      title: "Xuất kỳ trước",
      key: "soldPrev",
      width: 140,
      align: "right",
      sorter: (a, b) => a.soldPrev - b.soldPrev,
      render: (_: unknown, r) => (
        <span className="inline-flex items-center justify-end gap-1.5">
          {qty(r.soldPrev)}
          <ChangePill ratio={changeRatio(r.sold, r.soldPrev)} />
        </span>
      ),
    },
    {
      title: "Xuất TB/ngày",
      key: "avg",
      width: 110,
      align: "right",
      sorter: (a, b) => a.sold - b.sold,
      render: (_: unknown, r) => qty(r.sold / days, 2),
    },
    {
      title: "Trạng thái",
      key: "status",
      width: 140,
      render: (_: unknown, r) => {
        const o = stockOutlook(r, days, settings);
        return <Tag color={OUTLOOK_TAG[o.level].color} className="m-0">{o.label}</Tag>;
      },
    },
  ];

  return (
    <Card
      size="small"
      className="rounded-xl"
      title={`Xuất – Nhập – Tồn (${visible.length.toLocaleString("vi-VN")} mã)`}
      extra={
        <div className="flex items-center gap-2">
          <Input.Search allowClear size="small" className="w-56" placeholder="Tìm mã hoặc tên" onChange={(e) => setQuery(e.target.value)} />
          <Button size="small" disabled={visible.length === 0} onClick={() => downloadBlob(buildPeriodCsv(visible, periodText, days, settings), `xuat-nhap-ton-${periodText}.csv`)}>
            Xuất Excel
          </Button>
        </div>
      }
    >
      <div className="overflow-x-auto">
        <Table<PeriodRow>
          rowKey="productId"
          size="small"
          columns={columns}
          dataSource={visible}
          scroll={{ x: 1080 }}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: "Không có mã nào khớp bộ lọc." }}
        />
      </div>
    </Card>
  );
}
