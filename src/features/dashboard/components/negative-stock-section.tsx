"use client";

import { Card, DatePicker, Statistic, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { countNegativeByReason } from "../lib/dashboard-stats";
import { useNegativeStockReport } from "../hooks/useDashboard";
import type { NegativeStockLine } from "../types";
import { NegativeStockTable } from "./negative-stock-table";

function emptyDescriptionFor(date: string | null): string {
  return date === null
    ? "Hôm nay không có lần xuất âm nào."
    : `Ngày ${dayjs(date).format("DD/MM/YYYY")} không có lần xuất âm nào.`;
}

function NegativeStockContent({ rows }: { rows: NegativeStockLine[] }) {
  const counts = countNegativeByReason(rows);

  return (
    <>
      <Typography.Text type="secondary" className="mb-3 block text-[13px]">
        {rows.length.toLocaleString("vi-VN")} dòng phiếu làm tồn xuống dưới 0 — gồm hóa đơn và
        phiếu trả NCC đã ghi sổ.
      </Typography.Text>
      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        {counts.map((item) => (
          <Statistic key={item.code ?? "__null__"} title={item.label} value={item.count} />
        ))}
      </div>
      <NegativeStockTable rows={rows} />
    </>
  );
}

/**
 * D-01..D-04: khối báo cáo xuất âm — DatePicker (mặc định hôm nay, không chọn
 * được ngày tương lai), dải thẻ đếm theo lý do, bảng chi tiết bên dưới.
 */
export function NegativeStockSection() {
  const [date, setDate] = useState<string | null>(null);
  const query = useNegativeStockReport(date);

  return (
    <Card
      title="Xuất âm"
      extra={
        <DatePicker
          format="DD/MM/YYYY"
          value={date ? dayjs(date) : null}
          placeholder="Hôm nay"
          allowClear
          disabledDate={(current) => current.isAfter(dayjs(), "day")}
          onChange={(value) => setDate(value ? value.format("YYYY-MM-DD") : null)}
        />
      }
    >
      <QueryState query={query} emptyDescription={emptyDescriptionFor(date)}>
        {(rows) => <NegativeStockContent rows={rows} />}
      </QueryState>
    </Card>
  );
}
