"use client";

import { Alert, Button, Form, Input, Select, Switch } from "antd";
import {
  Controller,
  type Control,
  type FieldErrors,
  type UseFormGetValues,
  type UseFormSetValue,
} from "react-hook-form";

import { useAutoFillName } from "../hooks/useAutoFillName";
import type { ProductFormValues } from "../schemas/product.schema";
import { PRODUCT_KIND_LABELS, type Lookups, type ProductKind } from "../types";
import { LookupSelect } from "./lookup-select";
import { StandardFieldsSection } from "./standard-fields-section";

type Props = {
  control: Control<ProductFormValues>;
  errors: FieldErrors<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  getValues: UseFormGetValues<ProductFormValues>;
  lookups: Lookups | undefined;
  isNew: boolean;
  /** Ghi chú quy chuẩn tự sinh của mã đang sửa — chỉ đọc. */
  note: string | null;
};

const KIND_OPTIONS = (Object.keys(PRODUCT_KIND_LABELS) as ProductKind[]).map((kind) => ({
  value: kind,
  label: PRODUCT_KIND_LABELS[kind],
}));

/**
 * Form mã hàng theo 17 trường quy chuẩn (Notion). Quy đổi, tồn tối thiểu/tối đa,
 * barcode, được bán trực tiếp KHÔNG hiện nhưng vẫn giữ giá trị khi lưu (định mức
 * sửa ở Phân tích › Định mức).
 */
export function ProductFormFields({ control, errors, setValue, getValues, lookups, isNew, note }: Props) {
  const nameSheet = useAutoFillName({ control, setValue, getValues, enabled: isNew });

  return (
    <>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Form.Item label="Mã hàng" validateStatus={errors.code ? "error" : undefined} help={errors.code?.message}>
          <Controller name="code" control={control} render={({ field }) => <Input {...field} autoFocus={isNew} />} />
        </Form.Item>
        <Form.Item label="Loại hàng" help="Combo: bán theo bộ, tồn trừ trên các mã thành phần.">
          <Controller name="kind" control={control} render={({ field }) => <Select {...field} options={KIND_OPTIONS} />} />
        </Form.Item>
      </div>

      <Form.Item
        label="Tên hàng"
        validateStatus={errors.name ? "error" : undefined}
        help={errors.name?.message ?? (nameSheet.fromSheet ? "Tự điền từ sheet tên hàng chuẩn — sửa được." : undefined)}
      >
        <Controller name="name" control={control} render={({ field }) => <Input {...field} />} />
      </Form.Item>
      {nameSheet.error ? (
        <Alert
          className="mb-4"
          type="warning"
          showIcon
          title="Chưa tự điền được tên hàng từ sheet tên hàng chuẩn"
          description={`${nameSheet.error} Cứ gõ tên tay, hoặc bấm Thử lại.`}
          action={
            <Button size="small" loading={nameSheet.retrying} onClick={nameSheet.retry}>
              Thử lại
            </Button>
          }
        />
      ) : null}

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Form.Item label="Nhóm hàng">
          <Controller
            name="categoryId"
            control={control}
            render={({ field }) => (
              <LookupSelect
                table="nhom_hang"
                label="nhóm hàng"
                allowClear
                placeholder="Chưa phân nhóm"
                value={field.value}
                onChange={field.onChange}
                options={(lookups?.categories ?? []).map((c) => ({ value: c.id, label: c.name }))}
              />
            )}
          />
        </Form.Item>
        <Form.Item
          label="Đơn vị tính"
          validateStatus={errors.unitId ? "error" : undefined}
          help={errors.unitId?.message}
        >
          <Controller
            name="unitId"
            control={control}
            render={({ field }) => (
              <LookupSelect
                table="don_vi_tinh"
                label="đơn vị tính"
                value={field.value}
                onChange={(id) => field.onChange(id ?? "")}
                options={(lookups?.units ?? []).map((u) => ({ value: u.id, label: u.name }))}
              />
            )}
          />
        </Form.Item>
      </div>

      <StandardFieldsSection control={control} setValue={setValue} getValues={getValues} lookups={lookups} />
      {errors.stageId ? <div className="-mt-2 mb-3 text-xs text-red-600">{errors.stageId.message}</div> : null}

      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        <Form.Item label="Kho mặc định">
          <Controller
            name="defaultWarehouseId"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                allowClear
                placeholder="Không đặt"
                options={(lookups?.warehouses ?? []).map((w) => ({ value: w.id, label: w.name }))}
                onChange={(value) => field.onChange(value ?? null)}
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
            render={({ field }) => <Input {...field} value={field.value ?? ""} placeholder="Ví dụ: A-01" />}
          />
        </Form.Item>
      </div>

      <Form.Item label="Mô tả">
        <Controller
          name="description"
          control={control}
          render={({ field }) => <Input.TextArea {...field} value={field.value ?? ""} rows={2} />}
        />
      </Form.Item>

      {note ? (
        // Ghi chú do hệ thống tự sinh (0086) — chỉ đọc, đổi khi đủ trường quy chuẩn.
        <Alert className="mb-4" type="info" showIcon title="Ghi chú quy chuẩn" description={note} />
      ) : null}

      {!isNew ? (
        <Form.Item label="Đang kinh doanh" help="Tắt để ẩn mã khỏi danh sách mặc định. Tồn và lịch sử vẫn giữ nguyên.">
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
          />
        </Form.Item>
      ) : null}
    </>
  );
}
