"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Input } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { OrderFilter } from "../schemas/order.schema";

type Props = {
  filter: OrderFilter;
  onChange: (filter: OrderFilter) => void;
  addButton?: ReactNode;
};

export function OrderToolbar({ filter, onChange, addButton }: Props) {
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

  function searchDebounced(value: string) {
    setKeyword(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(
      () => onChange({ ...filter, q: value.trim(), page: 1 }),
      300,
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        allowClear
        value={keyword}
        prefix={<SearchOutlined />}
        placeholder="Số đơn hoặc tên người nhận"
        className="w-full sm:max-w-xs"
        onChange={(event) => searchDebounced(event.target.value)}
        onPressEnter={() => {
          if (debounce.current) clearTimeout(debounce.current);
          onChange({ ...filter, q: keyword.trim(), page: 1 });
        }}
      />
      {addButton ? <div className="ms-auto">{addButton}</div> : null}
    </div>
  );
}
