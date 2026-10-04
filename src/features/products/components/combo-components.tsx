"use client";

import { Alert, App, Button, InputNumber, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { useState } from "react";

import { ProductSearchInput } from "@/shared/components/product-search-input";
import { QueryState } from "@/shared/components/query-state";
import { explainError, isPostgrestError } from "@/shared/lib/errors";

import { useComboComponents, useSaveComboComponents } from "../hooks/useComboComponents";
import type { ComboComponent } from "../types";

type Props = { comboId: string; canEdit: boolean };

const columns: TableColumnsType<ComboComponent> = [
  { title: "Mã hàng", dataIndex: "code", width: 160, render: (code: string) => <span className="font-mono">{code}</span> },
  { title: "Tên hàng", dataIndex: "name", ellipsis: true },
  { title: "ĐVT", dataIndex: "unitName", width: 80, render: (u: string | null) => u ?? "—" },
  {
    title: "Số lượng / bộ",
    dataIndex: "quantity",
    width: 120,
    align: "right",
    className: "tabular-nums",
    render: (q: number) => q.toLocaleString("vi-VN"),
  },
];

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

function ComboComponentsEditor({
  comboId,
  draft,
  onChange,
  onDone,
}: {
  comboId: string;
  draft: ComboComponent[];
  onChange: (next: ComboComponent[]) => void;
  onDone: () => void;
}) {
  const { message } = App.useApp();
  const save = useSaveComboComponents(comboId);
  const [error, setError] = useState<string | null>(null);

  const setQuantity = (productId: string, quantity: number | null) =>
    onChange(draft.map((c) => (c.productId === productId ? { ...c, quantity: quantity ?? 0 } : c)));

  const invalid = draft.some((c) => !(c.quantity > 0));

  async function submit() {
    setError(null);
    try {
      const count = await save.mutateAsync(draft);
      message.success(`Đã lưu ${count} thành phần`);
      onDone();
    } catch (e) {
      // 23514: RPC nói rõ vì sao (lồng combo, trùng mã…) — hiện nguyên câu đó.
      if (isPostgrestError(e) && e.code === "23514") setError(e.message);
      else {
        const explained = explainError(e);
        setError(`${explained.title}. ${explained.action}`);
      }
    }
  }

  const editColumns: TableColumnsType<ComboComponent> = [
    ...columns.slice(0, 3),
    {
      title: "Số lượng / bộ",
      key: "quantity",
      width: 130,
      render: (_: unknown, row) => (
        <InputNumber
          size="small"
          min={0}
          className="w-full"
          value={row.quantity}
          status={row.quantity > 0 ? undefined : "error"}
          onChange={(v) => setQuantity(row.productId, v)}
        />
      ),
    },
    {
      key: "remove",
      width: 60,
      render: (_: unknown, row) => (
        <Button
          type="link"
          danger
          size="small"
          className="px-0"
          onClick={() => onChange(draft.filter((c) => c.productId !== row.productId))}
        >
          Bỏ
        </Button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-3">
      <ProductSearchInput
        disabled={save.isPending}
        onSelect={(product) => {
          if (product.id === comboId) {
            setError("Combo không chứa được chính nó.");
            return;
          }
          if (draft.some((c) => c.productId === product.id)) {
            setError(`Mã ${product.code} đã có trong danh sách — sửa số lượng của dòng đó.`);
            return;
          }
          setError(null);
          onChange([...draft, { productId: product.id, code: product.code, name: product.name, unitName: null, quantity: 1 }]);
        }}
      />
      <Table<ComboComponent>
        size="small"
        rowKey="productId"
        pagination={false}
        scroll={{ x: 560 }}
        columns={editColumns}
        dataSource={draft}
        locale={{ emptyText: "Gõ mã ở ô trên để thêm thành phần." }}
      />
      {error ? <Alert type="error" showIcon title={error} /> : null}
      <div className="flex gap-2">
        <Button type="primary" loading={save.isPending} disabled={invalid} onClick={() => void submit()}>
          Lưu thành phần
        </Button>
        <Button disabled={save.isPending} onClick={onDone}>
          Hủy
        </Button>
      </div>
      {invalid ? <Typography.Text type="danger">Số lượng / bộ phải lớn hơn 0.</Typography.Text> : null}
    </div>
  );
}
