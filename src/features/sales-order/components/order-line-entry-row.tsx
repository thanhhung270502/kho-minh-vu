"use client";

import type { InputNumberRef } from "@rc-component/input-number";
import { Button, InputNumber, Select, Typography } from "antd";
import type { RefSelectProps } from "antd/es/select";
import type { Ref } from "react";

import {
  ProductSearchInput,
  type ProductSearchResult,
} from "@/shared/components/product-search-input";
import { COMMON_GOODS_LABEL, type StaffRef } from "@/shared/lib/recipient";
import { filterByLabel } from "@/shared/lib/text";

type Props = {
  codeInputRef: Ref<RefSelectProps>;
  quantityInputRef: Ref<InputNumberRef>;
  quantity: number | null;
  selectedProduct: ProductSearchResult | null;
  pending: boolean;
  staff: StaffRef[];
  showRecipient: boolean;
  recipientId: string | null;
  onRecipientChange: (id: string | null) => void;
  onSelectProduct: (product: ProductSearchResult) => void;
  onQuantityChange: (value: number | null) => void;
  onSubmit: () => void;
};

/**
 * Hàng nhập liệu bàn phím của bảng dòng đơn — tách khỏi `order-line-table.tsx`
 * để file đó không vượt 200 dòng (CLAUDE.md Bước 6). Luồng bàn phím (XUAT-07):
 * gõ mã → Enter (bắt ở `onKeyDownCapture` bên trong `ProductSearchInput`, đã
 * chữa bẫy 14a) → ô số lượng → Enter → lưu dòng.
 */
export function OrderLineEntryRow({
  codeInputRef,
  quantityInputRef,
  quantity,
  selectedProduct,
  pending,
  staff,
  showRecipient,
  recipientId,
  onRecipientChange,
  onSelectProduct,
  onQuantityChange,
  onSubmit,
}: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-the border border-vien bg-nen-tong p-3">
      <div className="min-w-56 flex-1">
        <label className="mb-1 block text-[13px] text-chu-phu">Mã hàng</label>
        <ProductSearchInput
          inputRef={codeInputRef}
          disabled={pending}
          selected={selectedProduct}
          onSelect={onSelectProduct}
        />
      </div>

      <div className="w-28">
        <label className="mb-1 block text-[13px] text-chu-phu">Số lượng</label>
        <InputNumber
          ref={quantityInputRef}
          className="w-full"
          min={0}
          value={quantity}
          onChange={onQuantityChange}
          onPressEnter={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        />
      </div>

      {showRecipient ? (
        <div className="w-48">
          <label className="mb-1 block text-[13px] text-chu-phu">Người nhận</label>
          <Select
            allowClear
            showSearch
            className="w-full"
            placeholder={COMMON_GOODS_LABEL}
            value={recipientId ?? undefined}
            options={staff.map((person) => ({ value: person.id, label: person.name }))}
            filterOption={filterByLabel}
            onChange={(value) => onRecipientChange(value ?? null)}
          />
        </div>
      ) : null}

      <Button type="primary" loading={pending} onClick={onSubmit}>
        Thêm dòng
      </Button>

      <Typography.Text type="secondary" className="w-full text-xs">
        Gõ mã → Enter → số lượng → Enter là xong một dòng, con trỏ quay về ô
        mã.
        {showRecipient
          ? " Ô Người nhận giữ nguyên cho các dòng tiếp theo; để trống = hàng chung."
          : ""}
      </Typography.Text>
    </div>
  );
}
