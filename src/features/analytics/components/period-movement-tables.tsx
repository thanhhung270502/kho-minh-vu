"use client";

import { Card, Segmented, Tag } from "antd";
import type { TableColumnsType } from "antd";
import { useMemo, useState } from "react";

import { salesMovers, slowStock } from "../lib/period-analysis";
import type { PeriodRow } from "../types";
import { BarValue, CompactTable, Highlights, ProductCode, fmt, rankColumn } from "./ranking-parts";

type Direction = "up" | "down";

/** Mã tăng / giảm mạnh nhất so với kỳ trước (theo chênh lệch số lượng). */
export function MoversTable({ rows, limit }: { rows: PeriodRow[]; limit: number }) {
  const [dir, setDir] = useState<Direction>("up");
  const movers = useMemo(() => salesMovers(rows, limit), [rows, limit]);
  const list = movers[dir];
  const max = Math.max(0, ...list.map((r) => Math.abs(r.sold - r.soldPrev)));
  const net = rows.reduce((s, r) => s + r.sold - r.soldPrev, 0);

  const columns: TableColumnsType<PeriodRow> = [
    rankColumn<PeriodRow>(),
    { title: "Mã hàng", dataIndex: "code", width: 140, render: (code: string, r) => <ProductCode id={r.productId} code={code} /> },
    { title: "Tên hàng", dataIndex: "name", ellipsis: true },
    { title: "Kỳ trước", dataIndex: "soldPrev", width: 80, align: "right", render: (v: number) => fmt(v) },
    { title: "Kỳ này", dataIndex: "sold", width: 80, align: "right", render: (v: number) => fmt(v) },
    {
      title: "Chênh lệch",
      key: "delta",
      width: 120,
      align: "right",
      render: (_: unknown, r) => {
        const d = r.sold - r.soldPrev;
        return (
          <BarValue
            value={<span className={d > 0 ? "text-green-700" : "text-red-600"}>{`${d > 0 ? "+" : "−"}${fmt(Math.abs(d))}`}</span>}
            ratio={max > 0 ? Math.abs(d) / max : 0}
            tone={d > 0 ? "green" : "red"}
          />
        );
      },
    },
  ];

  return (
    <Card
      size="small"
      className="rounded-xl"
      title="Biến động so với kỳ trước"
      extra={
        <Segmented<Direction>
          size="small"
          value={dir}
          onChange={setDir}
          options={[
            { value: "up", label: "Tăng" },
            { value: "down", label: "Giảm" },
          ]}
        />
      }
    >
      <Highlights
        items={[
          { label: "Mã xuất tăng", value: fmt(movers.upCount), tone: "green" },
          { label: "Mã xuất giảm", value: fmt(movers.downCount), tone: "red" },
          { label: "Tổng xuất thay đổi", value: `${net >= 0 ? "+" : "−"}${fmt(Math.abs(net))}`, tone: net >= 0 ? "green" : "red" },
        ]}
      />
      <CompactTable
        rowKey="productId"
        columns={columns}
        data={list}
        empty={dir === "up" ? "Không mã nào xuất nhiều hơn kỳ trước." : "Không mã nào xuất ít hơn kỳ trước."}
      />
    </Card>
  );
}

type Kind = "noSales" | "overstock";
type SlowRow = { key: string; row: PeriodRow; coverDays: number | null };

/** Còn tồn mà kỳ này không bán, hoặc tồn đủ bán hơn một năm. */
export function SlowStockTable({ rows, days, limit }: { rows: PeriodRow[]; days: number; limit: number }) {
  const [kind, setKind] = useState<Kind>("noSales");
  const slow = useMemo(() => slowStock(rows, days, limit), [rows, days, limit]);
  const list: SlowRow[] =
    kind === "noSales"
      ? slow.noSales.map((row) => ({ key: row.productId, row, coverDays: null }))
      : slow.overstock.map((s) => ({ key: s.row.productId, ...s }));
  const max = list[0]?.row.closingStock ?? 0;

  const columns: TableColumnsType<SlowRow> = [
    rankColumn<SlowRow>(),
    { title: "Mã hàng", key: "code", width: 140, render: (_: unknown, s) => <ProductCode id={s.row.productId} code={s.row.code} /> },
    { title: "Tên hàng", key: "name", ellipsis: true, render: (_: unknown, s) => s.row.name },
    {
      title: "Tồn",
      key: "stock",
      width: 120,
      align: "right",
      render: (_: unknown, s) => (
        <BarValue
          value={`${fmt(s.row.closingStock)}${s.row.unitName ? ` ${s.row.unitName}` : ""}`}
          ratio={max > 0 ? s.row.closingStock / max : 0}
          tone="orange"
        />
      ),
    },
    {
      title: "Đủ xuất",
      key: "cover",
      width: 110,
      align: "right",
      render: (_: unknown, s) =>
        s.coverDays === null ? <Tag className="m-0">Không xuất</Tag> : `~${fmt(s.coverDays)} ngày`,
    },
  ];

  return (
    <Card
      size="small"
      className="rounded-xl"
      title="Tồn chậm luân chuyển"
      extra={
        <Segmented<Kind>
          size="small"
          value={kind}
          onChange={setKind}
          options={[
            { value: "noSales", label: "Không xuất" },
            { value: "overstock", label: "Tồn > 1 năm" },
          ]}
        />
      }
    >
      <Highlights
        items={[
          { label: "Mã còn tồn, không xuất", value: fmt(slow.noSalesCount), tone: "orange" },
          { label: "Tồn của các mã đó", value: fmt(slow.noSalesQty) },
          { label: "Mã tồn > 1 năm xuất", value: fmt(slow.overstockCount), tone: "orange" },
        ]}
      />
      <CompactTable
        rowKey="key"
        columns={columns}
        data={list}
        empty={kind === "noSales" ? "Mã nào còn tồn cũng có xuất trong kỳ." : "Không mã nào tồn quá một năm xuất."}
      />
    </Card>
  );
}
