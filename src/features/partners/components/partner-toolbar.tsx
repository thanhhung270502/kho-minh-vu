"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Button, Input } from "antd";
import { useEffect, useRef, useState, type ReactNode } from "react";

import type { PartnerFilter } from "../types";

type Props = {
  filter: PartnerFilter;
  canEdit: boolean;
  onChange: (patch: Partial<PartnerFilter>) => void;
  onAdd: () => void;
  /** Cụm nút Excel (xuất / nhập / file mẫu) — trang truyền vào. */
  excelActions?: ReactNode;
};

/** Ô tìm + nút "Thêm đối tác" — phần trên của thanh công cụ, khớp trang danh mục. */
export function PartnerToolbar({ filter, canEdit, onChange, onAdd, excelActions }: Props) {
  // Ô tìm gõ tới đâu hiện tới đó, nhưng chỉ đẩy lên URL sau 300ms để không
  // bắn một request mỗi phím.
  const [keyword, setKeyword] = useState(filter.q);
  const [previousQuery, setPreviousQuery] = useState(filter.q);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Từ khóa đổi từ bên ngoài (nút "Xóa bộ lọc", bấm back) thì ô tìm phải theo.
  // Chỉnh ngay trong lúc render, không dùng useEffect — cách React khuyến nghị
  // cho "state phụ thuộc prop", và tránh một vòng render thừa.
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
    debounce.current = setTimeout(() => onChange({ q: value.trim() }), 300);
  }

  function searchNow() {
    if (debounce.current) clearTimeout(debounce.current);
    onChange({ q: keyword.trim() });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Input
        allowClear
        value={keyword}
        prefix={<SearchOutlined />}
        placeholder="Tìm mã, tên, số điện thoại"
        className="w-full sm:max-w-md"
        onChange={(event) => searchDebounced(event.target.value)}
        onPressEnter={searchNow}
      />

      <div className="ms-auto flex flex-wrap items-center gap-2">
        {excelActions}
        {canEdit ? (
          <Button type="primary" onClick={onAdd}>
            Thêm nhà cung cấp
          </Button>
        ) : null}
      </div>
    </div>
  );
}
