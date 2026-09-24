"use client";

import { Alert, Table, Typography } from "antd";
import { useState, type Key } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useCountSheet } from "../hooks/useStocktake";
import type { CountSheetRow } from "../types";
import { ApproveSessionButton } from "./approve-session-button";

type Props = {
  sessionId: string;
  editable: boolean;
  canApprove: boolean;
};

/**
 * Danh sách mã chưa đếm — hiện TRƯỚC nút duyệt (D-07). Mặc định chấp nhận 0
 * cho MỌI mã chưa đếm (chọn sẵn toàn bộ); bỏ chọn = trả về "đếm bù" (không
 * duyệt được chừng nào còn mã bị bỏ chọn — chặn thật nằm ở RPC 23514, đây
 * chỉ là tooltip/blocker giải thích trước).
 *
 * `Set` lưu mã BỊ BỎ CHỌN (khuôn `reorder-level-table.tsx` — `overrides`) vì
 * mặc định là "chọn tất cả", lưu phần đối lập (nhỏ hơn) gọn hơn.
 */
export function UncountedPanel({ sessionId, editable, canApprove }: Props) {
  const sheet = useCountSheet(sessionId, "");
  const [deselected, setDeselected] = useState(() => new Set<string>());

  return (
    <QueryState query={sheet} isEmpty={() => false}>
      {(rows) => {
        const uncounted = rows.filter((row): row is CountSheetRow => row.lineId === null);
        const recountRows = rows.filter((row) => row.needsRecount);

        const acceptZeroProductIds = uncounted
          .filter((row) => !deselected.has(row.productId))
          .map((row) => row.productId);

        const blockers: string[] = [];
        if (deselected.size > 0) {
          blockers.push(`${deselected.size} mã chưa đếm đang chờ đếm bù`);
        }
        if (recountRows.length > 0) {
          blockers.push(`${recountRows.length} dòng chờ đếm lại`);
        }

        function toggle(keys: Key[]) {
          const selected = new Set(keys.map(String));
          const next = new Set<string>();
          for (const row of uncounted) {
            if (!selected.has(row.productId)) next.add(row.productId);
          }
          setDeselected(next);
        }

        return (
          <div className="flex flex-col gap-3">
            {uncounted.length === 0 ? (
              <Alert type="success" showIcon title="Mọi mã trong phạm vi đã được đếm" />
            ) : (
              <>
                <Alert
                  type="warning"
                  showIcon
                  title={`Còn ${uncounted.length} mã chưa đếm — duyệt sẽ tính tồn 0 cho mã được chọn`}
                />
                <Typography.Text type="secondary" className="text-xs">
                  Bỏ chọn một mã để trả nó về “đếm bù” thay vì chấp nhận tồn 0.
                </Typography.Text>
                <div className="overflow-x-auto">
                  <Table<CountSheetRow>
                    rowKey="productId"
                    size="small"
                    dataSource={uncounted}
                    scroll={{ x: "max-content" }}
                    pagination={{ pageSize: 100, showTotal: (count) => `${count.toLocaleString("vi-VN")} mã` }}
                    rowSelection={{
                      selectedRowKeys: acceptZeroProductIds,
                      onChange: toggle,
                      preserveSelectedRowKeys: true,
                    }}
                    columns={[
                      {
                        title: "Mã hàng",
                        dataIndex: "code",
                        key: "code",
                        width: 140,
                        render: (code: string) => <span className="font-mono">{code}</span>,
                      },
                      { title: "Tên hàng", dataIndex: "name", key: "name", ellipsis: true },
                      { title: "ĐVT", dataIndex: "unitName", key: "unitName", width: 70 },
                      { title: "Nhóm", dataIndex: "categoryName", key: "categoryName", width: 140 },
                      {
                        title: "Tồn sổ hiện tại",
                        dataIndex: "currentStock",
                        key: "currentStock",
                        width: 120,
                        align: "right",
                        render: (value: number) => value.toLocaleString("vi-VN"),
                      },
                      {
                        title: "Tồn KiotViet tạm",
                        dataIndex: "kiotVietStock",
                        key: "kiotVietStock",
                        width: 130,
                        align: "right",
                        render: (value: number | null) => (value === null ? "—" : value.toLocaleString("vi-VN")),
                      },
                    ]}
                  />
                </div>
              </>
            )}

            <ApproveSessionButton
              sessionId={sessionId}
              acceptZeroProductIds={acceptZeroProductIds}
              blockers={blockers}
              canApprove={canApprove}
              editable={editable}
            />
          </div>
        );
      }}
    </QueryState>
  );
}
