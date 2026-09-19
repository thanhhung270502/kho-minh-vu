"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { ProductFilter } from "../schemas/filter.schema";

type Props = {
  filter: ProductFilter;
  onChange: (filter: ProductFilter) => void;
  secondaryActions?: ReactNode;
  addButton?: ReactNode;
};

/** Ô tìm + hành động — phần trên của thanh công cụ, tách khỏi panel lọc. */
export function ProductToolbar({
  filter,
  onChange,
  secondaryActions,
  addButton,
}: Props) {
  const [keyword, setKeyword] = useState(filter.q);
  const [previousQuery, setPreviousQuery] = useState(filter.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Từ khóa đổi từ bên ngoài (Xóa bộ lọc, nút back) — chỉnh trong lúc render,
  // không dùng effect (xem SUMMARY plan 13).
  if (filter.q !== previousQuery) {
    setPreviousQuery(filter.q);
    setKeyword(filter.q);
  }

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  /** Mọi thay đổi điều kiện đều về trang 1 — giữ trang cũ dễ rơi vào trang trống. */
  function change(patch: Partial<ProductFilter>) {
    onChange({ ...filter, ...patch, page: 1 });
  }

  function searchDebounced(value: string) {
    setKeyword(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => change({ q: value.trim() }), 300);
  }

  function searchNow() {
    if (debounce.current) clearTimeout(debounce.current);
    change({ q: keyword.trim() });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        allowClear
        autoFocus
        value={keyword}
        prefix={<SearchOutlined />}
        placeholder="Mã hoặc tên hàng — vd: op po air blade"
        className="w-full sm:max-w-md"
        onChange={(event) => searchDebounced(event.target.value)}
        onPressEnter={searchNow}
      />
      <div className="ms-auto flex gap-2">
        {secondaryActions}
        {addButton}
      </div>
    </div>
  );
}
