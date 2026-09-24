"use client";

import { App, Segmented, Statistic, Table, Typography } from "antd";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useCountSheet, useSetRecount } from "../hooks/useStocktake";
import { LARGE_DISCREPANCY_THRESHOLD, isLargeDiscrepancy } from "../lib/discrepancy";
import type { CountSheetRow } from "../types";
import { buildDiscrepancyColumns } from "./discrepancy-columns";

type FilterOption = "tat_ca" | "co_lech" | "lech_lon" | "cho_dem_lai";

const FILTER_OPTIONS: { value: FilterOption; label: string }[] = [
  { value: "tat_ca", label: "Tất cả" },
  { value: "co_lech", label: "Có lệch" },
  { value: "lech_lon", label: "Lệch lớn" },
  { value: "cho_dem_lai", label: "Chờ đếm lại" },
];

type Props = {
  sessionId: string;
  editable: boolean;
  canApprove: boolean;
};

function describeSetRecountError(error: unknown): string {
  const code = errorCode(error);
  if (code === "42501") return "Tài khoản của bạn không có quyền đặt lại trạng thái đếm.";
  if (code === "23514" && isPostgrestError(error)) return error.message;
  const explained = explainError(error);
  return `${explained.title}. ${explained.action}`;
}

/**
 * Bảng lệch — chỉ hiện dòng ĐÃ đếm (`lineId !== null`, khuôn "hệ đề xuất —
 * người duyệt" của `reorder-level-table.tsx`). Danh sách chưa đếm nằm ở
 * `uncounted-panel.tsx` riêng (D-07). Chỉ hiện số lượng, không quy đổi ra
 * tiền tệ (D-17).
 */
export function DiscrepancyTable({ sessionId, editable, canApprove }: Props) {
  const { message } = App.useApp();
  const [filter, setFilter] = useState<FilterOption>("tat_ca");
  const sheet = useCountSheet(sessionId, "");
  const setRecount = useSetRecount(sessionId);

  async function handleSetRecount(row: CountSheetRow, value: boolean) {
    if (!row.lineId) return;
    try {
      await setRecount.mutateAsync({ lineId: row.lineId, value });
      message.success(value ? "Đã trả về đếm lại." : "Đã bỏ yêu cầu đếm lại.");
    } catch (error) {
      message.error({ content: describeSetRecountError(error), duration: 8 });
    }
  }

  return (
    <QueryState
      query={sheet}
      isEmpty={(rows) => rows.every((row) => row.lineId === null)}
      emptyDescription="Chưa có mã nào được đếm trong phiên này."
    >
      {(rows) => {
        const countedRows = rows.filter(
          (row): row is CountSheetRow & { counted: number; bookQuantity: number; discrepancy: number } =>
            row.lineId !== null &&
            row.counted !== null &&
            row.bookQuantity !== null &&
            row.discrepancy !== null,
        );

        const largeCount = countedRows.filter((row) => isLargeDiscrepancy(row.counted, row.bookQuantity)).length;
        const recountCount = countedRows.filter((row) => row.needsRecount).length;
        const diffCount = countedRows.filter((row) => row.discrepancy !== 0).length;
        const showKiotVietColumn = countedRows.some((row) => row.kiotVietStock !== null);

        const filtered = countedRows.filter((row) => {
          if (filter === "co_lech") return row.discrepancy !== 0;
          if (filter === "lech_lon") return isLargeDiscrepancy(row.counted, row.bookQuantity);
          if (filter === "cho_dem_lai") return row.needsRecount;
          return true;
        });

        const columns = buildDiscrepancyColumns({
          showKiotVietColumn,
          actionable: editable && canApprove,
          onSetRecount: handleSetRecount,
        });

        return (
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Statistic title="Đã đếm" value={countedRows.length} />
              <Statistic title="Có lệch" value={diffCount} />
              <Statistic title="Lệch lớn" value={largeCount} valueStyle={{ color: largeCount > 0 ? "#cf1322" : undefined }} />
              <Statistic title="Chờ đếm lại" value={recountCount} valueStyle={{ color: recountCount > 0 ? "#d46b08" : undefined }} />
            </div>

            <Typography.Text type="secondary" className="text-xs">
              Ngưỡng lệch lớn: từ {LARGE_DISCREPANCY_THRESHOLD.absolute} cái hoặc{" "}
              {LARGE_DISCREPANCY_THRESHOLD.ratio * 100}% tồn sổ.
            </Typography.Text>

            <div className="max-w-full overflow-x-auto">
              <Segmented value={filter} onChange={(value) => setFilter(value as FilterOption)} options={FILTER_OPTIONS} />
            </div>

            <div className="overflow-x-auto">
              <Table<CountSheetRow>
                rowKey="lineId"
                size="small"
                columns={columns}
                dataSource={filtered}
                rowClassName={(row) =>
                  row.counted !== null && row.bookQuantity !== null && isLargeDiscrepancy(row.counted, row.bookQuantity)
                    ? "bg-red-50"
                    : ""
                }
                scroll={{ x: "max-content" }}
                pagination={{ pageSize: 100, showTotal: (count) => `${count.toLocaleString("vi-VN")} mã` }}
                locale={{ emptyText: "Không có mã nào khớp bộ lọc đang chọn." }}
              />
            </div>
          </div>
        );
      }}
    </QueryState>
  );
}
