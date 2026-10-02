"use client";

import { Button, Select } from "antd";
import { useState } from "react";

import { filterByLabel } from "@/shared/lib/text";

import type { QuickLookupTable } from "../api/quick-lookup.api";
import { QuickLookupModal } from "./quick-lookup-modal";

type Props = {
  table: QuickLookupTable;
  label: string;
  value: string | null | undefined;
  onChange: (id: string | null) => void;
  options: { value: string; label: string }[];
  placeholder?: string;
  allowClear?: boolean;
};

/**
 * Ô chọn nhóm hàng / ĐVT / công đoạn trong form mã hàng, có "+ Thêm mới" ngay
 * tại chỗ (NVPT-04). Khuôn `partner-search-input`: nút nằm trong
 * notFoundContent để thấy ngay khi gõ không ra kết quả.
 */
export function LookupSelect({ table, label, value, onChange, options, placeholder, allowClear }: Props) {
  const [query, setQuery] = useState("");
  // Chốt chữ đang gõ lúc bấm "+ Thêm": modal lấy focus làm Select mất focus và
  // antd gọi onSearch("") — đọc thẳng `query` thì modal mở ra trống trơn.
  const [createName, setCreateName] = useState<string | null>(null);

  return (
    <>
      <Select
        showSearch
        allowClear={allowClear}
        className="w-full"
        placeholder={placeholder}
        value={value ?? undefined}
        options={options}
        filterOption={filterByLabel}
        onSearch={setQuery}
        onChange={(selected) => onChange(selected ?? null)}
        notFoundContent={
          <div className="flex flex-col items-start gap-1 px-1 py-1">
            <span className="text-xs text-chu-phu">
              {query.trim() ? `Chưa có ${label} "${query.trim()}".` : `Chưa có ${label} nào.`}
            </span>
            <Button
              size="small"
              type="link"
              className="h-auto px-0"
              // Giữ dropdown mở và giữ chữ đang gõ cho tới khi modal mở.
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => setCreateName(query)}
            >
              + Thêm {label} mới
            </Button>
          </div>
        }
      />
      <QuickLookupModal
        table={table}
        label={label}
        open={createName !== null}
        initialName={createName ?? ""}
        onClose={() => setCreateName(null)}
        onCreated={(id) => {
          onChange(id);
          setQuery("");
          setCreateName(null);
        }}
      />
    </>
  );
}
