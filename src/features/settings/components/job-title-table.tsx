"use client";

import { App, Button, Checkbox, Popconfirm, Space, Table, Tag, Tooltip } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { errorCode, explainError } from "@/shared/lib/errors";
import { BUSINESS_PERMISSIONS, SCOPE_LABELS } from "@/shared/lib/permissions";

import type { JobTitle } from "../api/job-title.api";
import { useDeleteJobTitle, useJobTitles, useSetJobTitlePermission } from "../hooks/useJobTitles";
import { JobTitleDrawer } from "./job-title-drawer";

/**
 * Chức vụ × 9 quyền (QUYEN-01). Bấm ô là lưu ngay — co_quyen() đọc thẳng bảng
 * nên người giữ chức vụ bị chặn/được phép ngay lần thao tác kế tiếp.
 */
export function JobTitleTable() {
  const { message } = App.useApp();
  const query = useJobTitles();
  const toggle = useSetJobTitlePermission();
  const remove = useDeleteJobTitle();
  const [drawer, setDrawer] = useState<{ open: boolean; row: JobTitle | null }>({ open: false, row: null });

  const showError = (error: unknown) => {
    if (errorCode(error) === "23503") {
      message.error("Còn người giữ chức vụ này. Chuyển họ sang chức vụ khác trước khi xóa.");
      return;
    }
    const explained = error instanceof Error && !("code" in error) ? { title: error.message, action: "" } : explainError(error);
    message.error(`${explained.title}. ${explained.action}`);
  };

  const columns: ColumnsType<JobTitle> = [
    {
      title: "Chức vụ",
      key: "name",
      width: 200,
      fixed: "left",
      render: (_: unknown, row) => (
        <div>
          <div className="font-medium">{row.name}</div>
          <Tag className="m-0 mt-1 text-xs">{SCOPE_LABELS[row.scope].split(" — ")[0]}</Tag>
        </div>
      ),
    },
    ...BUSINESS_PERMISSIONS.map((p) => ({
      title: (
        <Tooltip title={p.hint}>
          <span className="cursor-help">{p.label}</span>
        </Tooltip>
      ),
      key: p.key,
      width: 104,
      align: "center" as const,
      render: (_: unknown, row: JobTitle) => (
        <Checkbox
          aria-label={`${p.label} — ${row.name}`}
          checked={row.permissions.includes(p.key)}
          disabled={toggle.isPending}
          onChange={(event) =>
            toggle.mutate(
              { id: row.id, permission: p.key, enabled: event.target.checked },
              { onError: showError },
            )
          }
        />
      ),
    })),
    { title: "Số người", dataIndex: "userCount", width: 90, align: "right", className: "tabular-nums" },
    {
      title: "",
      key: "actions",
      width: 110,
      fixed: "right",
      render: (_: unknown, row) => (
        <Space size={4}>
          <Button type="link" size="small" className="px-0" onClick={() => setDrawer({ open: true, row })}>
            Sửa
          </Button>
          {row.isSystem ? null : (
            <Popconfirm
              title={`Xóa chức vụ ${row.name}?`}
              okText="Xóa"
              cancelText="Thôi"
              onConfirm={() =>
                remove.mutate(row.id, {
                  onSuccess: () => message.success(`Đã xóa chức vụ ${row.name}`),
                  onError: showError,
                })
              }
            >
              <Button type="link" size="small" danger className="px-0">
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="m-0 text-sm text-chu-phu">
          Bật/tắt quyền có hiệu lực ngay, người dùng không cần đăng nhập lại.
        </p>
        <Button type="primary" onClick={() => setDrawer({ open: true, row: null })}>
          Thêm chức vụ
        </Button>
      </div>

      <QueryState query={query} emptyDescription="Chưa có chức vụ nào. Bấm “Thêm chức vụ” để tạo.">
        {(rows) => (
          <div className="overflow-x-auto">
            <Table<JobTitle>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={rows}
              loading={query.isFetching}
              scroll={{ x: 1350 }}
              pagination={false}
            />
          </div>
        )}
      </QueryState>

      <JobTitleDrawer
        row={drawer.row}
        open={drawer.open}
        onClose={() => setDrawer((state) => ({ ...state, open: false }))}
      />
    </>
  );
}
