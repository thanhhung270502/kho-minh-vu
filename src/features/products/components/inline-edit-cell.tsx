"use client";

import { useQueryClient } from "@tanstack/react-query";
import { App, Select } from "antd";
import { useState, type ReactNode } from "react";

import { explainError } from "@/shared/lib/errors";
import { filterByLabel } from "@/shared/lib/text";

import { bulkAssign } from "../api/product.api";
import { productKeys } from "../api/product.keys";
import type { EditableProductField } from "../types";

type Props = {
  productId: string;
  field: Extract<EditableProductField, "stageId" | "categoryId" | "unitId">;
  label: ReactNode;
  options: Array<{ value: string; label: ReactNode }>;
  enabled: boolean;
};

/**
 * Sửa một ô ngay trên bảng. Cập nhật lạc quan: dòng đổi ngay, lỗi thì trả lại
 * giá trị cũ — rà 356 mã mà mỗi lần chờ round-trip thì không ai rà nổi.
 */
export function InlineEditCell({
  productId,
  field,
  label,
  options,
  enabled,
}: Props) {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  if (!enabled) return <>{label}</>;

  async function save(value: string) {
    setOpen(false);
    setSaving(true);

    // Ảnh chụp mọi trang danh sách đang cache, để hoàn lại nếu lỗi.
    const snapshot = queryClient.getQueriesData({ queryKey: productKeys.all });

    try {
      await bulkAssign([productId], { [field]: value || null }, "sua_o");
    } catch (error) {
      for (const [key, data] of snapshot) queryClient.setQueryData(key, data);
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    } finally {
      setSaving(false);
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
    }
  }

  if (!open) {
    return (
      <span
        role="button"
        tabIndex={0}
        className="cursor-pointer border-b border-dashed border-gray-300 hover:border-gray-600"
        title="Bấm để sửa nhanh"
        onClick={() => setOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter") setOpen(true);
        }}
      >
        {saving ? "…" : label}
      </span>
    );
  }

  return (
    <Select
      open
      autoFocus
      showSearch
      size="small"
      className="w-44"
      filterOption={filterByLabel}
      options={options}
      onChange={(value) => void save(value)}
      onBlur={() => setOpen(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    />
  );
}
