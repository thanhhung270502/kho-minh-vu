"use client";

import { App, Input, Table } from "antd";
import type { TableColumnsType } from "antd";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import { explainError } from "@/shared/lib/errors";
import { labelMatches } from "@/shared/lib/text";

/** Khung xem nhanh dưới một dòng danh sách. Bấm bên trong không được gập dòng lại. */
export function QuickViewFrame({ children }: { children: ReactNode }) {
  return (
    <div data-no-row-click className="flex cursor-default flex-col gap-4 px-2 py-3">
      {children}
    </div>
  );
}

export function QuickViewField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-xs text-chu-phu">{label}</div>
      <div className="truncate text-[13.5px] font-semibold">{children}</div>
    </div>
  );
}

/** Ghi chú lưu khi rời ô. Chỉ sửa được khi chứng từ còn nháp / tạm và người dùng có quyền. */
export function QuickViewNote({
  value,
  editable,
  onSave,
}: {
  value: string;
  editable: boolean;
  onSave: (note: string | null) => Promise<void>;
}) {
  const { message } = App.useApp();
  return (
    <Input.TextArea
      key={value}
      className="max-w-2xl"
      autoSize={{ minRows: 3, maxRows: 6 }}
      placeholder={editable ? "Ghi chú…" : "Không có ghi chú"}
      defaultValue={value}
      readOnly={!editable}
      onBlur={async (event) => {
        const text = event.target.value.trim();
        if (!editable || text === value) return;
        try {
          await onSave(text || null);
          message.success("Đã lưu ghi chú");
        } catch (error) {
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        }
      }}
    />
  );
}

type QuickViewLine = {
  id: string;
  productId: string;
  productCode: string;
  productName: string;
  unitName: string | null;
};

/**
 * Bảng dòng hàng của phần xem nhanh: một ô tìm (mã hoặc tên, không dấu) phủ cả hai
 * cột Mã và Tên; cột số lượng do từng màn truyền vào.
 */
export function QuickViewLineTable<T extends QuickViewLine>({
  lines,
  quantityColumns,
}: {
  lines: readonly T[];
  quantityColumns: TableColumnsType<T>;
}) {
  const [query, setQuery] = useState("");
  const visible = query.trim()
    ? lines.filter((l) => labelMatches(query, l.productCode) || labelMatches(query, l.productName))
    : lines;
  const columns: TableColumnsType<T> = [
    {
      title: (
        <Input size="small" allowClear placeholder="Tìm mã hoặc tên hàng" value={query} onChange={(e) => setQuery(e.target.value)} />
      ),
      colSpan: 2,
      dataIndex: "productCode",
      width: 220,
      render: (code: string, l) => (
        <Link href={`/danh-muc?chon=${l.productId}`} className="font-mono">
          {code}
        </Link>
      ),
    },
    {
      title: "Tên hàng",
      colSpan: 0,
      dataIndex: "productName",
      ellipsis: true,
      render: (name: string, l) => `${name}${l.unitName ? ` (${l.unitName})` : ""}`,
    },
    ...quantityColumns,
  ];
  return (
    <Table<T>
      rowKey="id"
      size="small"
      columns={columns}
      dataSource={visible as T[]}
      scroll={{ x: 560 }}
      pagination={{ pageSize: 10, showSizeChanger: false, hideOnSinglePage: true }}
      locale={{ emptyText: lines.length === 0 ? "Chưa có dòng nào." : "Không có dòng nào khớp ô tìm." }}
    />
  );
}

export const formatQuantity = (v: number) => Number(v).toLocaleString("vi-VN");
