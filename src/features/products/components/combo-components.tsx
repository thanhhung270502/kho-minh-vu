"use client";

import { Alert, Button, Table, Typography } from "antd";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useComboComponents } from "../hooks/useComboComponents";
import type { ComboComponent } from "../types";
import { ComboComponentsEditor, comboColumns as columns } from "./combo-components-editor";

type Props = { comboId: string; canEdit: boolean };

/**
 * Thành phần của mã loại Combo (0088). Xuất 1 combo trừ tồn từng mã ở đây theo
 * số lượng / bộ; combo không có tồn riêng.
 */
export function ComboComponents({ comboId, canEdit }: Props) {
  const query = useComboComponents(comboId);
  const [draft, setDraft] = useState<ComboComponent[] | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <Typography.Text type="secondary">
        Combo không có tồn riêng — xuất 1 bộ trừ tồn từng mã thành phần theo số lượng / bộ.
      </Typography.Text>
      {draft ? (
        <ComboComponentsEditor comboId={comboId} draft={draft} onChange={setDraft} onDone={() => setDraft(null)} />
      ) : (
        <QueryState
          query={query}
          isEmpty={() => false}
          skeleton={<Table size="small" loading columns={columns} dataSource={[]} />}
        >
          {(items) => (
            <>
              {items.length === 0 ? (
                <Alert
                  type="warning"
                  showIcon
                  title="Combo chưa có thành phần"
                  description="Phiếu xuất có mã này sẽ không ghi sổ được cho tới khi khai thành phần."
                />
              ) : (
                <Table<ComboComponent>
                  size="small"
                  rowKey="productId"
                  pagination={false}
                  scroll={{ x: 520 }}
                  columns={columns}
                  dataSource={items}
                />
              )}
              {canEdit ? (
                <Button className="self-start" onClick={() => setDraft(items)}>
                  Sửa thành phần
                </Button>
              ) : null}
            </>
          )}
        </QueryState>
      )}
    </div>
  );
}
