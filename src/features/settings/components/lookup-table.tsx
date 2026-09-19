"use client";

import { App, Button, Popconfirm, Space, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import {
  LOOKUP_TABLE_CONFIG,
  isSystemCode,
  type LookupRow,
  type LookupTableName,
} from "../api/lookup.api";
import { useDeleteLookupRow, useLookupRows } from "../hooks/useLookups";
import { LookupDrawer } from "./lookup-drawer";

export function LookupTable({ table }: { table: LookupTableName }) {
  const { message } = App.useApp();
  const config = LOOKUP_TABLE_CONFIG[table];
  const query = useLookupRows(table);
  const remove = useDeleteLookupRow(table);
  const [drawer, setDrawer] = useState<{ open: boolean; row: LookupRow | null }>({
    open: false,
    row: null,
  });

  const rows = useMemo(() => query.data ?? [], [query.data]);
  const nameById = useMemo(
    () => new Map(rows.map((row) => [row.id, `${row.ma} — ${row.ten}`])),
    [rows],
  );

  async function deleteRow(row: LookupRow) {
    try {
      await remove.mutateAsync(row.id);
      message.success(`Đã xóa ${config.label} ${row.ma}`);
    } catch (error) {
      if (errorCode(error) === "23503") {
        message.error(
          `Đang có mã hàng dùng ${config.label} này — đổi các mã đó sang ${config.label} khác trước khi xóa.`,
        );
        return;
      }
      // 23514 là mã hệ thống bị trigger 0040 chặn — câu tiếng Việt do chính
      // migration soạn, hiện nguyên văn.
      if (isPostgrestError(error) && error.code === "23514") {
        message.error(error.message);
        return;
      }
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  const columns: ColumnsType<LookupRow> = [
    {
      title: "Mã",
      dataIndex: "ma",
      width: 180,
      render: (code: string) => (
        <Space size={6}>
          <span className="font-medium">{code}</span>
          {isSystemCode(table, code) ? <Tag color="gold">Hệ thống</Tag> : null}
        </Space>
      ),
    },
    { title: "Tên", dataIndex: "ten", ellipsis: true },
    ...(config.hasParent
      ? [
          {
            title: "Nhóm cha",
            dataIndex: "parent_id",
            width: 240,
            render: (id: string | null) =>
              id ? (
                (nameById.get(id) ?? "(nhóm đã xóa)")
              ) : (
                <span className="text-gray-400">—</span>
              ),
          },
        ]
      : []),
    ...(config.hasColor
      ? [
          {
            title: "Màu",
            dataIndex: "mau_hien_thi",
            width: 120,
            render: (color: string | null) =>
              color ? (
                <Tag color={color}>{color}</Tag>
              ) : (
                <span className="text-gray-400">—</span>
              ),
          },
        ]
      : []),
    ...(config.hasAddress
      ? [{ title: "Địa chỉ", dataIndex: "dia_chi", ellipsis: true }]
      : []),
    ...(config.hasStatus
      ? [
          {
            title: "Trạng thái",
            dataIndex: "dang_hoat_dong",
            width: 120,
            render: (isActive: boolean) =>
              isActive ? <Tag color="green">Đang dùng</Tag> : <Tag>Ngừng</Tag>,
          },
        ]
      : []),
    {
      title: "",
      key: "actions",
      width: 130,
      align: "right",
      render: (_: unknown, row: LookupRow) => (
        <Space size={4}>
          <Button
            type="link"
            size="small"
            className="px-0"
            onClick={() => setDrawer({ open: true, row })}
          >
            Sửa
          </Button>
          {config.deletable && !isSystemCode(table, row.ma) ? (
            <Popconfirm
              title={`Xóa ${config.label} “${row.ten}”?`}
              description="Không khôi phục được. Mã hàng đang dùng sẽ chặn xóa."
              okText="Xóa"
              okButtonProps={{ danger: true, loading: remove.isPending }}
              cancelText="Thôi"
              onConfirm={() => void deleteRow(row)}
            >
              <Button type="link" size="small" danger className="px-0">
                Xóa
              </Button>
            </Popconfirm>
          ) : null}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button type="primary" onClick={() => setDrawer({ open: true, row: null })}>
          Thêm {config.label}
        </Button>
      </div>

      <QueryState
        query={query}
        emptyDescription={`Chưa có ${config.label} nào. Bấm “Thêm ${config.label}” để tạo.`}
      >
        {(loadedRows) => (
          <div className="overflow-x-auto">
            <Table<LookupRow>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={loadedRows}
              loading={query.isFetching}
              scroll={{ x: 720 }}
              pagination={false}
            />
          </div>
        )}
      </QueryState>

      <LookupDrawer
        table={table}
        row={drawer.row}
        open={drawer.open}
        allRows={rows}
        onClose={() => setDrawer((state) => ({ ...state, open: false }))}
      />
    </>
  );
}
