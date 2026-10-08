"use client";

import type { InputNumberRef } from "@rc-component/input-number";
import { Button, Input, InputNumber, Typography } from "antd";
import type { RefSelectProps } from "antd/es/select";
import type { Ref } from "react";

import {
  ProductSearchInput,
  type ProductSearchResult,
} from "@/shared/components/product-search-input";

type Props = {
  codeInputRef: Ref<RefSelectProps>;
  quantityInputRef: Ref<InputNumberRef>;
  quantity: number | null;
  note: string;
  selectedProduct: ProductSearchResult | null;
  pending: boolean;
  onSelectProduct: (product: ProductSearchResult) => void;
  onQuantityChange: (value: number | null) => void;
  onNoteChange: (value: string) => void;
  onSubmit: () => void;
};

/**
 * Hàng nhập liệu bàn phím của bảng dòng phiếu xuất — tách khỏi
 * `issue-line-table.tsx` để file đó không vượt 200 dòng (CLAUDE.md Bước 6).
 * Luồng bàn phím (XUAT-07): gõ mã → Enter (bắt ở `onKeyDownCapture` bên trong
 * `ProductSearchInput`, đã chữa bẫy 14a) → ô số lượng → Enter → lưu dòng.
 */
export function IssueLineEntryRow({
  codeInputRef,
  quantityInputRef,
  quantity,
  note,
  selectedProduct,
  pending,
  onSelectProduct,
  onQuantityChange,
  onNoteChange,
  onSubmit,
}: Props) {
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 rounded-the border border-vien bg-nen-tong p-3">
      <div className="min-w-56 flex-1">
        <label className="mb-1 block text-[15px] text-chu-phu">Mã hàng</label>
        <ProductSearchInput
          inputRef={codeInputRef}
          disabled={pending}
          selected={selectedProduct}
          onSelect={onSelectProduct}
        />
      </div>


      <div className="w-28">
        <label className="mb-1 block text-[15px] text-chu-phu">Số lượng</label>
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

      <div className="w-36">
        <label className="mb-1 block text-[15px] text-chu-phu">Ghi chú dòng</label>
        <Input
          value={note}
          placeholder="Tùy chọn"
          onChange={(event) => onNoteChange(event.target.value)}
          onPressEnter={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        />
      </div>

      <Button type="primary" loading={pending} onClick={onSubmit}>
        Thêm dòng
      </Button>

      <Typography.Text type="secondary" className="w-full text-xs">
        Gõ mã → Enter → số lượng → Enter là xong một dòng, con trỏ quay về ô
        mã. Cần ghi chú cho dòng thì gõ vào ô Ghi chú dòng trước khi Enter.
      </Typography.Text>
    </div>
  );
}
