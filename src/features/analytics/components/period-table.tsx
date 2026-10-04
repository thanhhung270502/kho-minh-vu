"use client";

import { Button, Card, Input, Switch, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { useMemo, useState } from "react";

import { downloadBlob } from "@/shared/lib/csv";
import { labelMatches } from "@/shared/lib/text";

import { buildPeriodCsv, changeRatio, hasActivity } from "../lib/period-analysis";
import type { PeriodRow } from "../types";

const n = (v: number) =>
  v === 0 ? <Typography.Text type="secondary">0</Typography.Text> : v.toLocaleString("vi-VN", { maximumFractionDigits: 2 });

const numberColumn = (title: string, key: keyof PeriodRow, width = 90) => ({
  title,
  dataIndex: key,
  key,
  width,
  align: "right" as const,
  className: "tabular-nums",
  sorter: (a: PeriodRow, b: PeriodRow) => Number(a[key]) - Number(b[key]),
  render: (v: number) => n(v),
});

const COLUMNS: TableColumnsType<PeriodRow> = [
  { title: "Mã hàng", dataIndex: "code", key: "code", width: 150, fixed: "left", render: (c: string) => <span className="font-mono">{c}</span> },
  { title: "Tên hàng", dataIndex: "name", key: "name", width: 260, ellipsis: true },
  numberColumn("Tồn đầu", "openingStock"),
  numberColumn("Nhập", "received"),
  { ...numberColumn("Xuất bán", "sold"), defaultSortOrder: "descend" },
  numberColumn("Xuất nội bộ", "internalOut", 100),
  numberColumn("Trả", "returned", 70),
  numberColumn("Điều chỉnh", "adjusted", 100),
  numberColumn("Tồn cuối", "closingStock"),
  numberColumn("Bán kỳ trước", "soldPrev", 110),
  {
    title: "± so kỳ trước",
    key: "change",
    width: 110,
    align: "right",
    sorter: (a, b) => (changeRatio(a.sold, a.soldPrev) ?? -Infinity) - (changeRatio(b.sold, b.soldPrev) ?? -Infinity),
    render: (_: unknown, r) => {
      const ratio = changeRatio(r.sold, r.soldPrev);
      if (ratio === null) return r.sold > 0 ? <Typography.Text type="success">mới bán</Typography.Text> : "—";
      return (
        <span className={ratio >= 0 ? "text-green-600" : "text-red-600"}>
          {ratio >= 0 ? "+" : ""}
          {(ratio * 100).toLocaleString("vi-VN", { maximumFractionDigits: 0 })}%
        </span>
      );
    },
  },
];

/** Xuất – nhập – tồn từng mã trong kỳ đã lọc. Mặc định xếp theo xuất bán giảm dần. */
export function PeriodTable({ rows, periodText }: { rows: PeriodRow[]; periodText: string }) {
  const [query, setQuery] = useState("");
  const [onlyActive, setOnlyActive] = useState(true);

  const visible = useMemo(
    () =>
      rows.filter(
        (r) => (!onlyActive || hasActivity(r)) && (!query.trim() || labelMatches(query, `${r.code} ${r.name}`)),
      ),
    [rows, onlyActive, query],
  );

  return (
    <Card
      size="small"
      title={`Xuất – Nhập – Tồn theo mã (${visible.length.toLocaleString("vi-VN")} mã)`}
      extra={
        <Button size="small" disabled={visible.length === 0} onClick={() => downloadBlob(buildPeriodCsv(visible, periodText), `xuat-nhap-ton-${periodText}.csv`)}>
          Xuất Excel
        </Button>
      }
    >
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <Input.Search allowClear className="max-w-72" placeholder="Tìm mã hoặc tên hàng" onChange={(e) => setQuery(e.target.value)} />
        <span className="flex items-center gap-2 text-sm">
          <Switch size="small" checked={onlyActive} onChange={setOnlyActive} />
          Chỉ mã có phát sinh hoặc còn tồn
        </span>
      </div>
      <div className="overflow-x-auto">
        <Table<PeriodRow>
          rowKey="productId"
          size="small"
          columns={COLUMNS}
          dataSource={visible}
          scroll={{ x: 1350 }}
          pagination={{ pageSize: 20, showSizeChanger: false, hideOnSinglePage: true }}
          locale={{ emptyText: "Không có mã nào khớp bộ lọc." }}
        />
      </div>
    </Card>
  );
}
