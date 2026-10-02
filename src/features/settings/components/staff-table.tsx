"use client";

import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import type { StaffRow } from "../api/staff.api";
import { useStaff } from "../hooks/useStaff";
import { StaffDrawer } from "./staff-drawer";

export function StaffTable() {
  const query = useStaff();
  const [drawer, setDrawer] = useState<{ open: boolean; row: StaffRow | null }>({
    open: false,
    row: null,
  });

  const columns: ColumnsType<StaffRow> = [
    { title: "Tên viết tắt", dataIndex: "shortName", width: 180 },
    { title: "Tên đầy đủ", dataIndex: "fullName", ellipsis: true },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 120,
      render: (isActive: boolean) =>
        isActive ? <Tag color="green">Đang dùng</Tag> : <Tag>Ngừng</Tag>,
    },
    {
      title: "",
      key: "actions",
      width: 80,
      align: "right",
      render: (_: unknown, row: StaffRow) => (
        <Button type="link" size="small" className="px-0" onClick={() => setDrawer({ open: true, row })}>
          Sửa
        </Button>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex justify-end">
        <Button type="primary" onClick={() => setDrawer({ open: true, row: null })}>
          Thêm nhân viên
        </Button>
      </div>

      <QueryState
        query={query}
        emptyDescription="Chưa có nhân viên phụ trách nào. Bấm “Thêm nhân viên” để tạo — đơn nội bộ chọn người nhận từ danh sách này."
      >
        {(rows) => (
          <div className="overflow-x-auto">
            <Table<StaffRow>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={rows}
              loading={query.isFetching}
              scroll={{ x: 560 }}
              pagination={false}
            />
          </div>
        )}
      </QueryState>

      <StaffDrawer
        row={drawer.row}
        open={drawer.open}
        onClose={() => setDrawer((state) => ({ ...state, open: false }))}
      />
    </>
  );
}
