"use client";

import { Card } from "antd";
import type { TableColumnsType } from "antd";
import { useMemo } from "react";

import { changeRatio, topCategories, topProducts, type CategoryRank } from "../lib/period-analysis";
import type { PeriodRow } from "../types";
import { MoversTable, SlowStockTable } from "./period-movement-tables";
import { BarValue, CompactTable, Highlights, ProductCode, fmt, pct, rankColumn } from "./ranking-parts";
import { ChangePill } from "./stat-card";

const LIMIT = 10;

type Props = {
  rows: PeriodRow[];
  /** Số ngày của kỳ — tính "đủ bán bao nhiêu ngày". */
  days: number;
};

/**
 * Bốn bảng xếp hạng theo kỳ, mỗi bảng có dải số tóm tắt ở đầu: bán chạy, nhóm hàng
 * (cái gì đang bán) rồi biến động, tồn chậm (cái gì đang đổi / đang nằm yên).
 */
export function PeriodRankings({ rows, days }: Props) {
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <TopProductsTable rows={rows} />
      <TopCategoriesTable rows={rows} />
      <MoversTable rows={rows} limit={LIMIT} />
      <SlowStockTable rows={rows} days={days} limit={LIMIT} />
    </div>
  );
}

function TopProductsTable({ rows }: { rows: PeriodRow[] }) {
  const { top, total } = useMemo(
    () => ({ top: topProducts(rows, LIMIT), total: rows.reduce((s, r) => s + r.sold, 0) }),
    [rows],
  );
  const max = top[0]?.sold ?? 0;
  const topSum = top.reduce((s, r) => s + r.sold, 0);
  const leader = top[0];

  const columns: TableColumnsType<PeriodRow> = [
    rankColumn<PeriodRow>(),
    { title: "Mã hàng", dataIndex: "code", width: 140, render: (code: string, r) => <ProductCode id={r.productId} code={code} /> },
    { title: "Tên hàng", dataIndex: "name", ellipsis: true },
    {
      title: "Xuất",
      dataIndex: "sold",
      width: 120,
      align: "right",
      render: (v: number) => <BarValue value={fmt(v)} ratio={max > 0 ? v / max : 0} />,
    },
    {
      title: "So kỳ trước",
      key: "change",
      width: 100,
      align: "right",
      render: (_: unknown, r) => <ChangePill ratio={changeRatio(r.sold, r.soldPrev)} previous={fmt(r.soldPrev)} />,
    },
  ];

  return (
    <Card size="small" className="rounded-xl" title="Bán chạy nhất">
      <Highlights
        items={[
          { label: `Top ${LIMIT} chiếm`, value: total > 0 ? `${pct(topSum / total)} tổng xuất` : "—" },
          { label: "Dẫn đầu", value: leader ? `${leader.code} · ${fmt(leader.sold)}` : "—" },
          { label: "Mã có bán", value: fmt(rows.filter((r) => r.sold > 0).length) },
        ]}
      />
      <CompactTable rowKey="productId" columns={columns} data={top} empty="Kỳ này chưa có mã nào bán." />
    </Card>
  );
}

function TopCategoriesTable({ rows }: { rows: PeriodRow[] }) {
  const all = useMemo(() => topCategories(rows, Number.POSITIVE_INFINITY), [rows]);
  const top = all.slice(0, LIMIT);
  const max = top[0]?.sold ?? 0;
  const top3Share = all.slice(0, 3).reduce((s, g) => s + g.share, 0);
  const growing = all.filter((g) => g.sold > g.soldPrev).length;

  const columns: TableColumnsType<CategoryRank> = [
    rankColumn<CategoryRank>(),
    { title: "Nhóm hàng", dataIndex: "name", ellipsis: true },
    { title: "Mã có bán", dataIndex: "products", width: 90, align: "right", render: (v: number) => fmt(v) },
    {
      title: "Xuất",
      dataIndex: "sold",
      width: 120,
      align: "right",
      render: (v: number) => <BarValue value={fmt(v)} ratio={max > 0 ? v / max : 0} />,
    },
    { title: "Tỷ trọng", dataIndex: "share", width: 80, align: "right", render: (v: number) => pct(v) },
    {
      title: "So kỳ trước",
      key: "change",
      width: 100,
      align: "right",
      render: (_: unknown, g) => <ChangePill ratio={changeRatio(g.sold, g.soldPrev)} previous={fmt(g.soldPrev)} />,
    },
  ];

  return (
    <Card size="small" className="rounded-xl" title="Nhóm hàng bán nhiều nhất">
      <Highlights
        items={[
          { label: "Nhóm có bán", value: fmt(all.length) },
          { label: "Top 3 nhóm chiếm", value: all.length > 0 ? pct(top3Share) : "—" },
          { label: "Nhóm bán tăng", value: `${fmt(growing)} / ${fmt(all.length)}`, tone: "green" },
        ]}
      />
      <CompactTable rowKey="key" columns={columns} data={top} empty="Kỳ này chưa có nhóm nào bán." />
    </Card>
  );
}
