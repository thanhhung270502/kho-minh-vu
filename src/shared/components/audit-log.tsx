"use client";

import { useQuery } from "@tanstack/react-query";
import { Tag, Timeline, Typography } from "antd";
import dayjs from "dayjs";
import type { ReactNode } from "react";

import {
  auditLogKey,
  fetchAuditLog,
  type AuditedTable,
  type AuditLogEntry,
} from "@/shared/api/audit-log.api";
import { QueryState } from "@/shared/components/query-state";

/** Khóa là giá trị cột `nhat_ky_sua.nguon` trong database — không đổi. */
const SOURCE_LABELS: Record<string, string> = {
  form: "Sửa tay",
  sua_o: "Sửa trên bảng",
  hang_loat: "Sửa hàng loạt",
  goi_y_duoi: "Gợi ý công đoạn",
  import: "Nhập Excel",
  ra_ghi_chu: "Rà ghi chú",
  cai_dat: "Cài đặt",
  script: "Nạp dữ liệu",
};

/** Sentinel của database: một dòng nhật ký đánh dấu bản ghi vừa được tạo. */
const CREATED_FIELD = "_tao_moi";

type Props = {
  table: AuditedTable;
  id: string;
  fieldLabels: Record<string, string>;
  /** Đổi uuid nhóm hàng / ĐVT / công đoạn thành tên đọc được. */
  renderValue?: (field: string, value: unknown) => ReactNode;
};

function defaultRenderValue(value: unknown): ReactNode {
  if (value === null || value === undefined || value === "") return "(trống)";
  if (typeof value === "boolean") return value ? "Có" : "Không";
  return String(value);
}

/** Một lần lưu sửa nhiều trường → gom thành một mục trên dòng thời gian. */
function groupByEdit(entries: AuditLogEntry[]): AuditLogEntry[][] {
  const groups = new Map<string, AuditLogEntry[]>();

  for (const entry of entries) {
    const key = `${entry.editedAt}|${entry.editorId ?? ""}|${entry.source}`;
    const existing = groups.get(key);
    if (existing) existing.push(entry);
    else groups.set(key, [entry]);
  }

  return [...groups.values()];
}

export function AuditLog({ table, id, fieldLabels, renderValue }: Props) {
  const history = useQuery({
    queryKey: auditLogKey(table, id),
    queryFn: () => fetchAuditLog(table, id),
  });

  const render = (field: string, value: unknown): ReactNode =>
    renderValue?.(field, value) ?? defaultRenderValue(value);

  return (
    <QueryState
      query={history}
      emptyDescription="Chưa có lần sửa nào kể từ khi bật nhật ký."
    >
      {(entries) => (
        <Timeline
          className="mt-2"
          items={groupByEdit(entries).map((group) => {
            const first = group[0];

            return {
              key: first.id,
              children: (
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{first.editorName ?? "Hệ thống"}</strong>
                    <Typography.Text type="secondary">
                      {dayjs(first.editedAt).format("HH:mm DD/MM/YYYY")}
                    </Typography.Text>
                    <Tag>{SOURCE_LABELS[first.source] ?? first.source}</Tag>
                  </div>

                  <ul className="mt-1 list-none ps-0 text-sm">
                    {group.map((entry) =>
                      entry.field === CREATED_FIELD ? (
                        <li key={entry.id}>Tạo mới</li>
                      ) : (
                        <li key={entry.id}>
                          <span className="text-gray-500">
                            {fieldLabels[entry.field] ?? entry.field}:
                          </span>{" "}
                          <span className="text-gray-400 line-through">
                            {render(entry.field, entry.oldValue)}
                          </span>{" "}
                          → <span>{render(entry.field, entry.newValue)}</span>
                        </li>
                      ),
                    )}
                  </ul>
                </div>
              ),
            };
          })}
        />
      )}
    </QueryState>
  );
}
