"use client";

import { Button, Form, Select } from "antd";
import { useEffect, useMemo } from "react";
import {
  useFieldArray,
  useFormState,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
} from "react-hook-form";

import type { CodeDictionary } from "@/features/product-codes/lib/parse-product-code";
import type { CodeEntry } from "@/features/product-codes/lib/sync-entries";
import { filterByLabel } from "@/shared/lib/text";

import { usageLine, vehicleLabels, withUsageLine } from "../lib/shared-vehicles";
import type { ProductFormValues } from "../schemas/product.schema";

type Props = {
  control: Control<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  getValues: UseFormGetValues<ProductFormValues>;
  entries: ReadonlyArray<CodeEntry>;
  dictionary: CodeDictionary;
};

/**
 * Xe dùng chung (0093): một phụ tùng lắp được nhiều hãng / dòng xe. Hãng + dòng
 * CHÍNH vẫn tách từ mã ở ô phía trên; đây là các xe thêm. Có từ 2 xe trở lên thì
 * dòng đầu Mô tả tự thành "Dùng cho xe A và B".
 */
export function SharedVehiclesField({ control, setValue, getValues, entries, dictionary }: Props) {
  const { fields, append, remove } = useFieldArray({ control, name: "sharedVehicles" });
  const brandCode = useWatch({ control, name: "brandCode" });
  const modelCode = useWatch({ control, name: "modelCode" });
  const shared = useWatch({ control, name: "sharedVehicles" });
  const { dirtyFields, errors } = useFormState({ control });

  const brandOptions = useMemo(
    () => entries.filter((e) => e.loai === "hang").map((e) => ({ value: e.ma, label: `${e.ten} (${e.ma})` })),
    [entries],
  );
  const modelOptions = (brand: string | null) =>
    entries
      .filter((e) => e.loai === "dong" && (e.ma_hang ?? "").toUpperCase() === (brand ?? "").toUpperCase())
      .map((e) => ({ value: e.ma, label: `${e.ten} (${e.ma})` }));

  // Chỉ viết lại Mô tả khi người dùng ĐỔI xe — mở form sửa không đụng mô tả đã lưu.
  const vehiclesTouched = Boolean(dirtyFields.sharedVehicles || dirtyFields.brandCode || dirtyFields.modelCode);
  useEffect(() => {
    if (!vehiclesTouched || entries.length === 0) return;
    const labels = vehicleLabels(dictionary, { brandCode, modelCode }, shared ?? []);
    const current = getValues("description");
    const next = withUsageLine(current, usageLine(labels));
    if (next !== current) setValue("description", next, { shouldDirty: true });
  }, [vehiclesTouched, entries.length, dictionary, brandCode, modelCode, shared, getValues, setValue]);

  return (
    <div className="mb-2">
      {fields.map((field, index) => {
        const row = shared?.[index];
        const brandError = errors.sharedVehicles?.[index]?.brandCode?.message;
        const modelError = errors.sharedVehicles?.[index]?.modelCode?.message;
        return (
          <div key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-x-2">
            <Form.Item
              label={index === 0 ? "Hãng xe dùng chung" : undefined}
              validateStatus={brandError ? "error" : undefined}
              help={brandError}
              className="mb-2"
            >
              <Select
                showSearch
                placeholder="Chọn hãng"
                filterOption={filterByLabel}
                value={row?.brandCode || undefined}
                options={brandOptions}
                onChange={(value: string) => {
                  setValue(`sharedVehicles.${index}.brandCode`, value, { shouldDirty: true, shouldValidate: true });
                  // Đổi hãng thì dòng xe cũ không còn đúng cặp.
                  setValue(`sharedVehicles.${index}.modelCode`, null, { shouldDirty: true });
                }}
              />
            </Form.Item>
            <Form.Item
              label={index === 0 ? "Dòng xe dùng chung" : undefined}
              validateStatus={modelError ? "error" : undefined}
              help={modelError}
              className="mb-2"
            >
              <Select
                showSearch
                placeholder={row?.brandCode ? "Chọn dòng xe" : "Chọn hãng trước"}
                disabled={!row?.brandCode}
                filterOption={filterByLabel}
                value={row?.modelCode || undefined}
                options={modelOptions(row?.brandCode ?? null)}
                onChange={(value: string | undefined) =>
                  setValue(`sharedVehicles.${index}.modelCode`, value ?? null, { shouldDirty: true, shouldValidate: true })
                }
              />
            </Form.Item>
            <Form.Item label={index === 0 ? " " : undefined} className="mb-2">
              <Button danger type="text" aria-label="Bỏ xe dùng chung này" onClick={() => remove(index)}>
                Bỏ
              </Button>
            </Form.Item>
          </div>
        );
      })}
      <Button
        type="dashed"
        size="small"
        onClick={() => append({ brandCode: brandCode ?? null, modelCode: null })}
        disabled={fields.length >= 20}
      >
        + Thêm xe dùng chung
      </Button>
    </div>
  );
}
