"use client";

import { App, Input, Segmented, Select, Table, Typography } from "antd";
import { useMemo, useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { explainError } from "@/shared/lib/errors";
import { removeDiacritics } from "@/shared/lib/text";

import { useCountSheet, useDeleteCount, useSaveCount, useStocktakeLookups } from "../hooks/useStocktake";
import { countQuantitySchema } from "../schemas/stocktake.schema";
import type { CountSheetRow } from "../types";
import { buildCountDeskColumns, countInputDomId } from "./count-desk-columns";

type Props = { sessionId: string; editable: boolean };

type StatusFilter = "tat_ca" | "chua_dem" | "da_dem" | "can_dem_lai";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "Tất cả", value: "tat_ca" },
  { label: "Chưa đếm", value: "chua_dem" },
  { label: "Đã đếm", value: "da_dem" },
  { label: "Cần đếm lại", value: "can_dem_lai" },
];

function matchesStatus(row: CountSheetRow, filter: StatusFilter): boolean {
  if (filter === "chua_dem") return row.lineId === null;
  if (filter === "da_dem") return row.lineId !== null;
  if (filter === "can_dem_lai") return row.needsRecount;
  return true;
}

/**
 * Bảng đếm văn phòng (KKE-02): gõ bàn phím liên tục theo dòng, lọc theo nhóm
 * hàng để chia việc (D-05), đếm mù — KHÔNG có cột tồn sổ/tồn KiotViet/lệch
 * (D-08). Enter hoặc blur đổi giá trị lưu số đếm rồi nhảy focus xuống dòng kế
 * trong danh sách ĐANG HIỂN THỊ (khuôn `setTimeout(..., 0)` — bẫy 14b).
 */
export function CountDeskTable({ sessionId, editable }: Props) {
  const { message } = App.useApp();
  const lookups = useStocktakeLookups();

  const [categoryId, setCategoryId] = useState<string>("");
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<StatusFilter>("tat_ca");
  const [pending, setPending] = useState<Record<string, number | null>>({});

  const sheet = useCountSheet(sessionId, categoryId || undefined);
  const saveCount = useSaveCount(sessionId);
  const deleteCount = useDeleteCount(sessionId);

  const categories = useMemo(() => {
    const scoped = new Map<string, string>();
    for (const row of sheet.data ?? []) scoped.set(row.categoryId, row.categoryName);
    return [...scoped.entries()].map(([id, name]) => ({ id, name }));
  }, [sheet.data]);

  const filteredRows = useMemo(() => {
    const rows = sheet.data ?? [];
    const query = removeDiacritics(search.trim()).toLowerCase();
    return rows.filter((row) => {
      if (!matchesStatus(row, status)) return false;
      if (!query) return true;
      return (
        removeDiacritics(row.code).toLowerCase().includes(query) ||
        removeDiacritics(row.name).toLowerCase().includes(query)
      );
    });
  }, [sheet.data, search, status]);

  function focusNext(productId: string) {
    const index = filteredRows.findIndex((row) => row.productId === productId);
    const next = filteredRows[index + 1];
    if (!next) return;
    const element = document.getElementById(countInputDomId(next.productId));
    if (element instanceof HTMLInputElement) element.focus();
  }

  async function commit(row: CountSheetRow) {
    const value = pending[row.productId];
    if (value === undefined) return;

    const parsed = countQuantitySchema.safeParse(value);
    if (!parsed.success) {
      message.error(parsed.error.issues[0]?.message ?? "Số đếm không hợp lệ.");
      return;
    }

    try {
      await saveCount.mutateAsync({ productId: row.productId, quantity: parsed.data });
      setPending((current) => {
        const rest = { ...current };
        delete rest[row.productId];
        return rest;
      });
      setTimeout(() => focusNext(row.productId), 0);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  async function removeCount(row: CountSheetRow) {
    if (!row.lineId) return;
    try {
      await deleteCount.mutateAsync(row.lineId);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  const columns = buildCountDeskColumns({
    editable,
    pendingValue: (productId) => pending[productId] ?? null,
    onInput: (productId, value) =>
      setPending((current) => ({ ...current, [productId]: value })),
    onCommit: (row) => void commit(row),
    onDelete: (row) => void removeCount(row),
  });

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <Select
          className="w-48"
          placeholder="Tất cả nhóm hàng"
          allowClear
          loading={lookups.isPending}
          value={categoryId || undefined}
          onChange={(value) => setCategoryId(value ?? "")}
          options={categories.map((c) => ({ value: c.id, label: c.name }))}
        />
        <Input
          className="w-56"
          placeholder="Tìm mã hoặc tên hàng"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Segmented<StatusFilter>
          value={status}
          onChange={setStatus}
          options={STATUS_OPTIONS}
        />
      </div>

      <Typography.Text type="secondary" className="text-xs">
        Gõ số → Enter là lưu và xuống dòng. Lưu lại mã đã đếm sẽ ghi đè và chốt
        lại tồn sổ tại lúc lưu.
      </Typography.Text>

      <QueryState query={sheet} emptyDescription="Không có mã nào khớp bộ lọc.">
        {() => (
          <div className="overflow-x-auto">
            <Table<CountSheetRow>
              rowKey="productId"
              size="small"
              columns={columns}
              dataSource={filteredRows}
              pagination={{ pageSize: 100 }}
              scroll={{ x: "max-content" }}
              locale={{ emptyText: "Không có mã nào khớp bộ lọc." }}
            />
          </div>
        )}
      </QueryState>
    </div>
  );
}
