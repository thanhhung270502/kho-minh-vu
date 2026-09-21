"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useRef, useState } from "react";

import type { InventoryFilter } from "../schemas/inventory.schema";

type Props = {
  filter: InventoryFilter;
  onChange: (next: InventoryFilter) => void;
};

/**
 * Ô tìm một dòng theo mã/tên. Gõ không dấu được vì `danh_sach_ton_kho` so bằng
 * `f_unaccent` ở database. State cục bộ chỉ là chữ đang gõ dở — điều kiện lọc
 * thật vẫn sống trên URL.
 */
export function StockToolbar({ filter, onChange }: Props) {
  const [keyword, setKeyword] = useState(filter.q);
  const [previousQuery, setPreviousQuery] = useState(filter.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Từ khóa đổi từ bên ngoài (Xóa bộ lọc, nút back) — chỉnh trong lúc render,
  // không dùng effect (lint react-hooks/set-state-in-effect).
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

  function search(value: string) {
    onChange({ ...filter, q: value.trim(), page: 1 });
  }

  function searchDebounced(value: string) {
    setKeyword(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(value), 300);
  }

  return (
    <Input
      allowClear
      value={keyword}
      prefix={<SearchOutlined />}
      placeholder="Mã hoặc tên hàng — vd: op po air blade"
      className="w-full sm:max-w-md"
      onChange={(event) => searchDebounced(event.target.value)}
      onPressEnter={() => {
        if (debounce.current) clearTimeout(debounce.current);
        search(keyword);
      }}
    />
  );
}
