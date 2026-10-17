"use client";

import { Form, Segmented, Select } from "antd";
import { Controller, useWatch, type Control } from "react-hook-form";

import { filterByLabel } from "@/shared/lib/text";

import type { OpenSessionInput } from "../schemas/stocktake.schema";
import { ProductScopePicker, type PickedProduct } from "./product-scope-picker";

type Props = {
  control: Control<OpenSessionInput>;
  productIdsError: string | undefined;
  categories: { id: string; name: string }[];
  categoriesLoading: boolean;
  warehouseId: string;
  picked: PickedProduct[];
  onPickedChange: (next: PickedProduct[]) => void;
};

/** Phạm vi phiên: theo nhóm hàng (bỏ trống = toàn kho) HOẶC chọn từng mã (0129). */
export function SessionScopeFields({
  control,
  productIdsError,
  categories,
  categoriesLoading,
  warehouseId,
  picked,
  onPickedChange,
}: Props) {
  const scope = useWatch({ control, name: "scope" });

  return (
    <>
      <Form.Item label="Kiểm những mã nào">
        <Controller
          name="scope"
          control={control}
          render={({ field }) => (
            <Segmented
              block
              value={field.value}
              onChange={(next) => field.onChange(next)}
              options={[
                { label: "Theo nhóm hàng", value: "category" },
                { label: "Chọn từng mã", value: "products" },
              ]}
            />
          )}
        />
      </Form.Item>

      {scope === "category" ? (
        <Form.Item
          label="Nhóm hàng"
          help="Bỏ trống = kiểm toàn kho (dùng cho đợt kiểm đầu kỳ trước go-live)."
        >
          <Controller
            name="categoryIds"
            control={control}
            render={({ field }) => (
              <Select
                mode="multiple"
                showSearch
                placeholder="Chọn nhóm hàng"
                loading={categoriesLoading}
                value={field.value}
                onChange={field.onChange}
                filterOption={filterByLabel}
                options={categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            )}
          />
        </Form.Item>
      ) : (
        <Form.Item
          label="Mã cần kiểm"
          validateStatus={productIdsError ? "error" : undefined}
          help={productIdsError}
        >
          <ProductScopePicker
            warehouseId={warehouseId}
            value={picked}
            onChange={onPickedChange}
          />
        </Form.Item>
      )}
    </>
  );
}
