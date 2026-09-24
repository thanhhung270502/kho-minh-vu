"use client";

import { Button, Progress, Select, Table, Tag } from "antd";
import type { TableColumnsType } from "antd";
import dayjs from "dayjs";
import Link from "next/link";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useStocktakeLookups, useStocktakeSessions } from "../hooks/useStocktake";
import {
  SESSION_STATUS_COLORS,
  SESSION_STATUS_LABELS,
  sessionStatus,
} from "../lib/session-status";
import type { StocktakeSession, StocktakeSessionState } from "../types";
import { OpenSessionDrawer } from "./open-session-drawer";

const PAGE_SIZE = 20;

const STATUS_OPTIONS: { value: StocktakeSessionState; label: string }[] = [
  { value: "NHAP_LIEU", label: "Đang mở" },
  { value: "HOAN_THANH", label: "Đã duyệt" },
  { value: "DA_HUY", label: "Đã hủy" },
];

function progressColumn(row: StocktakeSession) {
  const percent =
    row.scopeCount > 0 ? Math.round((row.countedCount / row.scopeCount) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <Progress percent={percent} size="small" showInfo={false} />
      <span className="text-xs text-gray-500">
        {row.countedCount}/{row.scopeCount}
      </span>
    </div>
  );
}

function statusColumn(row: StocktakeSession) {
  const status = sessionStatus({
    state: row.state,
    counted: row.countedCount,
    scope: row.scopeCount,
    recount: row.recountCount,
  });
  return <Tag color={SESSION_STATUS_COLORS[status]}>{SESSION_STATUS_LABELS[status]}</Tag>;
}

const COLUMNS: TableColumnsType<StocktakeSession> = [
  {
    title: "Số phiên",
    dataIndex: "docNo",
    width: 140,
    fixed: "left",
    render: (docNo: string, row) => (
      <Link href={`/kiem-ke/${row.id}`} className="font-mono">
        {docNo}
      </Link>
    ),
  },
  {
    title: "Ngày",
    dataIndex: "date",
    width: 110,
    render: (date: string) => dayjs(date).format("DD/MM/YYYY"),
  },
  { title: "Kho", dataIndex: "warehouseName", width: 120 },
  {
    title: "Phạm vi",
    dataIndex: "categoryNames",
    width: 200,
    ellipsis: true,
    render: (names: string | null) => names ?? "Toàn kho",
  },
  { title: "Tiến độ", width: 160, render: (_, row) => progressColumn(row) },
  {
    title: "Chờ đếm lại",
    dataIndex: "recountCount",
    width: 110,
    align: "right",
    render: (value: number) => (value > 0 ? value : null),
  },
  { title: "Trạng thái", width: 120, render: (_, row) => statusColumn(row) },
  { title: "Người mở", dataIndex: "createdBy", width: 160, ellipsis: true },
];

export function SessionList({
  canOpen,
  isStorekeeper,
}: {
  canOpen: boolean;
  isStorekeeper: boolean;
}) {
  const [warehouseId, setWarehouseId] = useState("");
  const [status, setStatus] = useState<StocktakeSessionState | "">("");
  const [page, setPage] = useState(1);
  const [openDrawer, setOpenDrawer] = useState(false);

  const lookups = useStocktakeLookups();
  const allWarehouses = lookups.data?.warehouses ?? [];
  const assignedIds = lookups.data?.assignedWarehouseIds ?? [];
  const warehouseOptions = isStorekeeper
    ? allWarehouses.filter((w) => assignedIds.includes(w.id))
    : allWarehouses;

  const sessions = useStocktakeSessions({
    p_kho_id: warehouseId || undefined,
    p_trang_thai: status || undefined,
    p_trang: page,
    p_kich_thuoc: PAGE_SIZE,
  });
  const rows = sessions.data?.rows ?? [];
  const total = sessions.data?.total ?? 0;

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <Select
          allowClear
          placeholder="Kho"
          className="w-40"
          value={warehouseId || undefined}
          onChange={(value) => {
            setWarehouseId(value ?? "");
            setPage(1);
          }}
          options={warehouseOptions.map((w) => ({ value: w.id, label: w.name }))}
        />
        <Select
          allowClear
          placeholder="Trạng thái"
          className="w-40"
          value={status || undefined}
          onChange={(value) => {
            setStatus((value ?? "") as StocktakeSessionState | "");
            setPage(1);
          }}
          options={STATUS_OPTIONS}
        />
        <div className="flex-1" />
        {canOpen ? (
          <Button type="primary" onClick={() => setOpenDrawer(true)}>
            Mở phiên kiểm kê
          </Button>
        ) : null}
      </div>

      <div className="overflow-x-auto">
        <QueryState
          query={sessions}
          isEmpty={(page) => page.rows.length === 0}
          emptyDescription='Chưa có phiên kiểm kê nào. Bấm “Mở phiên kiểm kê” để bắt đầu.'
        >
          {() => (
            <Table<StocktakeSession>
              rowKey="id"
              size="small"
              sticky
              columns={COLUMNS}
              dataSource={rows}
              loading={sessions.isFetching && !sessions.isPending}
              scroll={{ x: "max-content" }}
              pagination={{
                current: page,
                pageSize: PAGE_SIZE,
                total,
                showSizeChanger: false,
                showTotal: (count) => `${count.toLocaleString("vi-VN")} phiên`,
                onChange: setPage,
              }}
            />
          )}
        </QueryState>
      </div>

      <OpenSessionDrawer
        open={openDrawer}
        onClose={() => setOpenDrawer(false)}
        isStorekeeper={isStorekeeper}
      />
    </>
  );
}
