"use client";

import { Form, Input, Switch } from "antd";
import { Controller, type Control, type FieldErrors } from "react-hook-form";

import type { ProductFormValues } from "../schemas/product.schema";
import type { Lookups } from "../types";
import { LookupSelect } from "./lookup-select";

type Props = {
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  lookups: Lookups | undefined;
};

/** Loại hàng, Dòng xe, Vị trí kệ, Được bán trực tiếp (IMP-05) — tách khỏi ngăn kéo cho gọn. */
export function ProductClassificationFields({ control, errors, lookups }: Props) {
  const toOptions = (items: Lookups["productTypes"] | undefined) =>
    (items ?? []).map((item) => ({ value: item.id, label: item.name }));

  return (
    <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
      <Form.Item label="Loại hàng">
        <Controller
          name="productTypeId"
          control={control}
          render={({ field }) => (
            <LookupSelect
              table="loai_hang"
              label="loại hàng"
              allowClear
              placeholder="Chưa chọn"
              value={field.value}
              onChange={field.onChange}
              options={toOptions(lookups?.productTypes)}
            />
          )}
        />
      </Form.Item>

      <Form.Item label="Dòng xe">
        <Controller
          name="vehicleLineId"
          control={control}
          render={({ field }) => (
            <LookupSelect
              table="dong_xe"
              label="dòng xe"
              allowClear
              placeholder="Chưa chọn"
              value={field.value}
              onChange={field.onChange}
              options={toOptions(lookups?.vehicleLines)}
            />
          )}
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
