"use client";

import { Alert, App, Button, InputNumber, Table, Typography } from "antd";
import type { TableColumnsType } from "antd";
import { useState } from "react";

import { ProductSearchInput, type ProductSearchResult } from "@/shared/components/product-search-input";
import { explainError, isPostgrestError } from "@/shared/lib/errors";

import { fetchComponentCandidate } from "../api/combo.api";
import { useSaveComboComponents } from "../hooks/useComboComponents";
import type { ComboComponent } from "../types";

export const comboColumns: TableColumnsType<ComboComponent> = [
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

/** Sửa danh sách thành phần — thay toàn bộ khi lưu (RPC luu_thanh_phan_combo). */
export function ComboComponentsEditor({
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
  const [checking, setChecking] = useState(false);

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

  async function addComponent(product: ProductSearchResult) {
    if (product.id === comboId) {
      setError("Combo không chứa được chính nó.");
      return;
    }
    if (draft.some((c) => c.productId === product.id)) {
      setError(`Mã ${product.code} đã có trong danh sách — sửa số lượng của dòng đó.`);
      return;
    }
    setChecking(true);
    try {
      const candidate = await fetchComponentCandidate(product.id);
      // RPC luu_thanh_phan_combo cũng chặn, nhưng báo ngay lúc chọn thì khỏi mất công nhập tiếp.
      if (candidate.kind === "COMBO") {
        setError(`Mã ${product.code} là combo — không đưa combo vào thành phần của combo khác.`);
        return;
      }
      setError(null);
      onChange([
        ...draft,
        { productId: product.id, code: product.code, name: product.name, unitName: candidate.unitName, quantity: 1 },
      ]);
    } catch (e) {
      const explained = explainError(e);
      setError(`Không kiểm tra được mã ${product.code}: ${explained.title}. ${explained.action}`);
    } finally {
      setChecking(false);
    }
  }

  const editColumns: TableColumnsType<ComboComponent> = [
    ...comboColumns.slice(0, 3),
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
      <ProductSearchInput disabled={save.isPending || checking} onSelect={(product) => void addComponent(product)} />
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
