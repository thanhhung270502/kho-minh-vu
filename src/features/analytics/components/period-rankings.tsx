"use client";

import { Card, Segmented } from "antd";
import { useMemo, useState } from "react";

import { changeRatio, salesMovers, slowStock, topCategories, topProducts } from "../lib/period-analysis";
import type { PeriodRow } from "../types";
import { RankList, type RankItem } from "./rank-list";
import { ChangePill } from "./stat-card";

const LIMIT = 10;
const n = (v: number) => v.toLocaleString("vi-VN", { maximumFractionDigits: 0 });
const pct = (v: number) => `${(v * 100).toLocaleString("vi-VN", { maximumFractionDigits: 1 })}%`;
const productHref = (r: PeriodRow) => `/danh-muc/${r.productId}`;
const ratioOf = (v: number, max: number) => (max > 0 ? v / max : 0);

type Props = {
  rows: PeriodRow[];
  /** Số ngày của kỳ — tính "đủ bán bao nhiêu ngày". */
  days: number;
};

/** Bốn bảng xếp hạng theo kỳ: bán chạy, nhóm hàng, biến động so kỳ trước, tồn chậm. */
export function PeriodRankings({ rows, days }: Props) {
  const [moveDir, setMoveDir] = useState<"up" | "down">("up");
  const [slowKind, setSlowKind] = useState<"noSales" | "overstock">("noSales");

  const data = useMemo(
    () => ({
      top: topProducts(rows, LIMIT),
      categories: topCategories(rows, LIMIT),
      movers: salesMovers(rows, LIMIT),
      slow: slowStock(rows, days, LIMIT),
    }),
    [rows, days],
  );

  const topMax = data.top[0]?.sold ?? 0;
  const topItems: RankItem[] = data.top.map((r) => ({
    key: r.productId,
    href: productHref(r),
    title: r.code,
    subtitle: r.name,
    value: n(r.sold),
    note: <ChangePill ratio={changeRatio(r.sold, r.soldPrev)} previous={n(r.soldPrev)} />,
    ratio: ratioOf(r.sold, topMax),
  }));

  const catMax = data.categories[0]?.sold ?? 0;
  const catItems: RankItem[] = data.categories.map((g) => ({
    key: g.key,
    title: g.name,
    subtitle: `${pct(g.share)} tổng xuất · ${n(g.products)} mã có bán`,
    value: n(g.sold),
    note: <ChangePill ratio={changeRatio(g.sold, g.soldPrev)} previous={n(g.soldPrev)} />,
    ratio: ratioOf(g.sold, catMax),
  }));

  const moves = data.movers[moveDir];
  const moveMax = Math.max(0, ...moves.map((r) => Math.abs(r.sold - r.soldPrev)));
  const moveItems: RankItem[] = moves.map((r) => {
    const delta = r.sold - r.soldPrev;
    return {
      key: r.productId,
      href: productHref(r),
      title: r.code,
      subtitle: r.name,
      value: `${delta > 0 ? "+" : "−"}${n(Math.abs(delta))}`,
      note: `${n(r.soldPrev)} → ${n(r.sold)}`,
      ratio: ratioOf(Math.abs(delta), moveMax),
    };
  });

  const slowRows =
    slowKind === "noSales"
      ? data.slow.noSales.map((r) => ({ row: r, note: "Không bán trong kỳ" }))
      : data.slow.overstock.map(({ row, coverDays }) => ({ row, note: `Đủ bán ~${n(coverDays)} ngày` }));
  const slowMax = slowRows[0]?.row.closingStock ?? 0;
  const slowItems: RankItem[] = slowRows.map(({ row, note }) => ({
    key: row.productId,
    href: productHref(row),
    title: row.code,
    subtitle: row.name,
    value: `${n(row.closingStock)}${row.unitName ? ` ${row.unitName}` : ""}`,
    note,
    ratio: ratioOf(row.closingStock, slowMax),
  }));

  return (
    <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
      <Card size="small" className="rounded-xl" title="Bán chạy nhất">
        <RankList items={topItems} empty="Kỳ này chưa có mã nào bán." />
      </Card>
      <Card size="small" className="rounded-xl" title="Nhóm hàng bán nhiều nhất">
        <RankList items={catItems} monoTitle={false} empty="Kỳ này chưa có nhóm nào bán." />
      </Card>
      <Card
        size="small"
        className="rounded-xl"
        title="Biến động so với kỳ trước"
        extra={
          <Segmented<"up" | "down">
            size="small"
            value={moveDir}
            onChange={setMoveDir}
            options={[
              { value: "up", label: "Tăng" },
              { value: "down", label: "Giảm" },
            ]}
          />
        }
      >
        <RankList
          items={moveItems}
          tone={moveDir === "up" ? "green" : "red"}
          empty={moveDir === "up" ? "Không mã nào bán nhiều hơn kỳ trước." : "Không mã nào bán ít hơn kỳ trước."}
        />
      </Card>
      <Card
        size="small"
        className="rounded-xl"
        title="Tồn chậm luân chuyển"
        extra={
          <Segmented<"noSales" | "overstock">
            size="small"
            value={slowKind}
            onChange={setSlowKind}
            options={[
              { value: "noSales", label: "Không bán" },
              { value: "overstock", label: "Tồn > 1 năm" },
            ]}
          />
        }
      >
        <RankList
          items={slowItems}
          tone="orange"
          empty={slowKind === "noSales" ? "Mã nào còn tồn cũng có bán trong kỳ." : "Không mã nào tồn quá một năm bán."}
        />
      </Card>
    </div>
  );
}
