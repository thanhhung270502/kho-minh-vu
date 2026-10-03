"use client";

import { Form, Input, Select, Switch } from "antd";
import { Controller, type Control, type FieldErrors } from "react-hook-form";

import type { ProductFormValues } from "../schemas/product.schema";
import { PRODUCT_KIND_LABELS, type ProductKind } from "../types";

type Props = {
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
};

const KIND_OPTIONS = (Object.keys(PRODUCT_KIND_LABELS) as ProductKind[]).map((kind) => ({
  value: kind,
  label: PRODUCT_KIND_LABELS[kind],
}));

/**
 * Loại hàng (Hàng hóa / Combo), Vị trí kệ, Được bán trực tiếp. Hãng xe / Dòng
 * xe / Linh kiện tự điền từ mã theo quy chuẩn — không nhập ở đây.
 */
export function ProductClassificationFields({ control, errors }: Props) {
  return (
    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
      <Form.Item label="Loại hàng" help="Combo: bán theo bộ, tồn trừ trên các mã thành phần.">
        <Controller
          name="kind"
          control={control}
          render={({ field }) => <Select {...field} options={KIND_OPTIONS} />}
        />
      </Form.Item>

      <Form.Item
        label="Vị trí kệ"
        validateStatus={errors.shelfLocation ? "error" : undefined}
        help={errors.shelfLocation?.message}
      >
        <Controller
          name="shelfLocation"
          control={control}
          render={({ field }) => (
            <Input {...field} value={field.value ?? ""} placeholder="Ví dụ: A-01" />
          )}
        />
      </Form.Item>

      <Form.Item label="Được bán trực tiếp" help="Tắt nếu mã chỉ dùng nội bộ, không bán thẳng cho khách.">
        <Controller
          name="directSale"
          control={control}
          render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
        />
      </Form.Item>
    </div>
  );
}
