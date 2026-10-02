"use client";

import { Card, Table } from "antd";
import Link from "next/link";

import { finishSummary, slowMoving, topGroups, topSellers, type FinishSummary, type GroupSummary } from "../lib/analysis";
import type { AnalysisRow } from "../types";
import { formatQty } from "./status-tag";

const productLink = (code: string, r: AnalysisRow) => (
  <Link href={`/danh-muc/${r.productId}`} className="font-mono">
    {code}
  </Link>
);

function SmallTable<T extends object>(props: { rowKey: keyof T & string; data: T[]; columns: object[]; empty: string }) {
  return (
    <div className="overflow-x-auto">
      <Table<T>
        rowKey={props.rowKey}
        size="small"
        pagination={false}
        dataSource={props.data}
        columns={props.columns as never}
        locale={{ emptyText: props.empty }}
      />
    </div>
  );
}

/** Theo loại hoàn thiện, bán chạy, 15 nhóm, tồn chậm — các bảng xếp hạng nhỏ. */
export function Rankings({ rows }: { rows: AnalysisRow[] }) {
  const slow = slowMoving(rows);
  const productCols = (extra: object) => [
    { title: "Mã hàng", dataIndex: "code", render: productLink },
    { title: "Tên hàng", dataIndex: "name", ellipsis: true },
    extra,
  ];
  return (
    <div className="grid grid-cols-1 gap-3 xl:grid-cols-2">
      <Card size="small" title="Theo loại hoàn thiện">
        <SmallTable<FinishSummary>
          rowKey="finish"
          data={finishSummary(rows)}
          empty="Chưa có dữ liệu."
          columns={[
            { title: "Loại", dataIndex: "label" },
            { title: "Số mã", dataIndex: "products", align: "right", render: (n: number) => formatQty(n) },
            { title: "Tồn", dataIndex: "stock", align: "right", render: (n: number) => formatQty(n) },
            { title: "Bán trong kỳ", dataIndex: "sold", align: "right", render: (n: number) => formatQty(n) },
          ]}
        />
      </Card>
      <Card size="small" title="Bán chạy nhất (top 10)">
        <SmallTable<AnalysisRow>
          rowKey="productId"
          data={topSellers(rows, 10)}
          empty="Chưa có mã nào bán trong kỳ."
          columns={productCols({ title: "Bán", dataIndex: "soldInPeriod", align: "right", render: (n: number) => formatQty(n) })}
        />
      </Card>
      <Card size="small" title="15 nhóm hàng bán nhiều nhất">
        <SmallTable<GroupSummary & { key: string }>
          rowKey="key"
          data={topGroups(rows, 15).map((g) => ({ ...g, key: g.categoryId ?? "-" }))}
          empty="Chưa có nhóm nào bán trong kỳ."
          columns={[
            { title: "Nhóm hàng", dataIndex: "categoryName", ellipsis: true },
            { title: "Bán", dataIndex: "sold", align: "right", render: (n: number) => formatQty(n) },
            { title: "Tồn", dataIndex: "stock", align: "right", render: (n: number) => formatQty(n) },
            { title: "Số ngày tồn", dataIndex: "daysOfCover", align: "right", render: (n: number | null) => formatQty(n, 0) },
          ]}
        />
      </Card>
      <Card size="small" title="Tồn chậm luân chuyển">
        <div className="mb-1 text-xs text-chu-phu">Không có tín hiệu bán trong kỳ (top 30 theo tồn)</div>
        <SmallTable<AnalysisRow>
          rowKey="productId"
          data={slow.noSales}
          empty="Mã nào còn tồn cũng có bán."
          columns={productCols({ title: "Tồn", dataIndex: "stock", align: "right", render: (n: number) => formatQty(n) })}
        />
        <div className="mt-3 mb-1 text-xs text-chu-phu">Đủ bán ≥ 365 ngày (top 20 theo tồn)</div>
        <SmallTable<AnalysisRow>
          rowKey="productId"
          data={slow.overstock}
          empty="Không mã nào tồn quá một năm bán."
          columns={productCols({ title: "Còn (ngày)", dataIndex: "daysOfCover", align: "right", render: (n: number | null) => formatQty(n, 0) })}
        />
      </Card>
    </div>
  );
}
