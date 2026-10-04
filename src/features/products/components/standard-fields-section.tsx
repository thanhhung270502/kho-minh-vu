"use client";

import { Button, Form, Select, Tag } from "antd";
import { useEffect, useMemo } from "react";
import {
  useFormState,
  useWatch,
  type Control,
  type UseFormGetValues,
  type UseFormSetValue,
} from "react-hook-form";

import { useCodeDictionary } from "@/features/product-codes/hooks/useCodeDictionary";
import { parseProductCode, type CodeField } from "@/features/product-codes/lib/parse-product-code";
import { filterByLabel } from "@/shared/lib/text";

import type { ProductFormValues } from "../schemas/product.schema";
import {
  STANDARD_FIELD_LABELS,
  applyCodeToStandardFields,
  toggleManual,
  type StandardFieldKey,
} from "../lib/standard-fields";
import type { Lookups } from "../types";
import { SharedVehiclesField } from "./shared-vehicles-field";

type Props = {
  control: Control<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  getValues: UseFormGetValues<ProductFormValues>;
  lookups: Lookups | undefined;
};

const FIELD_OF: Record<StandardFieldKey, "brandCode" | "modelCode" | "partCode" | "stageId"> = {
  hang_xe: "brandCode",
  dong_xe: "modelCode",
  linh_kien: "partCode",
  xu_ly: "stageId",
};
const ISSUE_FIELD: Record<StandardFieldKey, CodeField> = {
  hang_xe: "brand",
  dong_xe: "model",
  linh_kien: "part",
  xu_ly: "finish",
};

/**
 * Hãng xe / Dòng xe / Linh kiện / Xử lý (quy chuẩn mã, phần A). Gõ mã → tách
 * bằng bộ mã hóa ngay trên trình duyệt → tự điền; ô không tách được hiện lý
 * do và cho chọn tay (đánh dấu "Chọn tay", đổi mã không ghi đè ô đó).
 */
export function StandardFieldsSection({ control, setValue, getValues, lookups }: Props) {
  const { entries, dictionary } = useCodeDictionary();
  const code = useWatch({ control, name: "code" });
  const brandCode = useWatch({ control, name: "brandCode" });
  const modelCode = useWatch({ control, name: "modelCode" });
  const partCode = useWatch({ control, name: "partCode" });
  const stageId = useWatch({ control, name: "stageId" });
  const current = { brandCode, modelCode, partCode, stageId };
  const manualFields = useWatch({ control, name: "manualFields" });
  const { dirtyFields } = useFormState({ control, name: "code" });

  const stages = useMemo(
    () => (lookups?.stages ?? []).map((s) => ({ id: s.id, standardCode: s.standardCode })),
    [lookups?.stages],
  );
  // Mã không tách được xử lý → Mua ngoài (ngoài quy chuẩn), cùng mặc định của mã mới.
  const fallbackStageId = lookups?.stages.find((s) => s.code === "MUA_NGOAI")?.id ?? "";
  const parsed = useMemo(() => parseProductCode(code ?? "", dictionary), [code, dictionary]);

  // Chỉ tự điền khi NGƯỜI DÙNG gõ mã (ô mã "dirty") — mở form sửa không ghi đè dữ liệu đã lưu.
  useEffect(() => {
    if (!dirtyFields.code || entries.length === 0) return;
    const next = applyCodeToStandardFields(parsed, {
      brandCode: getValues("brandCode"),
      modelCode: getValues("modelCode"),
      partCode: getValues("partCode"),
      stageId: getValues("stageId"),
      manualFields: getValues("manualFields"),
    }, stages, fallbackStageId);
    setValue("brandCode", next.brandCode, { shouldDirty: true });
    setValue("modelCode", next.modelCode, { shouldDirty: true });
    setValue("partCode", next.partCode, { shouldDirty: true });
    setValue("stageId", next.stageId, { shouldDirty: true });
  }, [parsed, dirtyFields.code, entries.length, stages, fallbackStageId, getValues, setValue]);

  const options = useMemo(() => {
    const opt = (kind: string, filter: (e: (typeof entries)[number]) => boolean = () => true) =>
      entries
        .filter((e) => e.loai === kind && filter(e))
        .map((e) => ({ value: e.ma, label: `${e.ten} (${e.ma})` }));
    return {
      hang_xe: opt("hang"),
      dong_xe: opt("dong", (e) => (e.ma_hang ?? "").toUpperCase() === (brandCode ?? "").toUpperCase()),
      linh_kien: opt("linh_kien"),
      xu_ly: (lookups?.stages ?? []).map((s) => ({
        value: s.id,
        label: s.standardCode ? `${s.name} (${s.standardCode})` : `${s.name} — ngoài quy chuẩn`,
      })),
    };
  }, [entries, brandCode, lookups?.stages]);

  const choose = (key: StandardFieldKey, value: string | null) => {
    const field = FIELD_OF[key];
    if (field === "stageId") setValue(field, value ?? "", { shouldDirty: true });
    else setValue(field, value, { shouldDirty: true });
    setValue("manualFields", toggleManual(getValues("manualFields"), key, true) as ProductFormValues["manualFields"], {
      shouldDirty: true,
    });
  };

  const followCode = (key: StandardFieldKey) => {
    const without = toggleManual(getValues("manualFields"), key, false) as ProductFormValues["manualFields"];
    setValue("manualFields", without, { shouldDirty: true });
    const next = applyCodeToStandardFields(parsed, {
      brandCode: getValues("brandCode"),
      modelCode: getValues("modelCode"),
      partCode: getValues("partCode"),
      stageId: getValues("stageId"),
      manualFields: without,
    }, stages, fallbackStageId);
    const field = FIELD_OF[key];
    setValue(field, next[field] ?? (field === "stageId" ? getValues("stageId") : null), { shouldDirty: true });
  };

  return (
    <div className="mb-2 rounded border border-gray-100 bg-gray-50 p-3">
      <div className="mb-2 text-xs text-chu-phu">
        Quy chuẩn mã — tự điền khi gõ mã{parsed.status === "ok" && code ? ": mã đúng chuẩn" : ""}.
      </div>
      <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
        {(Object.keys(STANDARD_FIELD_LABELS) as StandardFieldKey[]).map((key) => {
          const field = FIELD_OF[key];
          const manual = (manualFields ?? []).includes(key);
          const issue = parsed.issues.find((i) => i.field === ISSUE_FIELD[key]);
          return (
            <Form.Item
              key={key}
              label={
                <span className="flex items-center gap-2">
                  {STANDARD_FIELD_LABELS[key]}
                  {manual ? (
                    <Tag className="m-0" color="orange">Chọn tay</Tag>
                  ) : code && !issue ? (
                    <Tag className="m-0" color="green">Tự điền</Tag>
                  ) : null}
                </span>
              }
              validateStatus={issue && !manual && code ? "warning" : undefined}
              help={
                manual ? (
                  <Button type="link" size="small" className="h-auto px-0" onClick={() => followCode(key)}>
                    Lấy lại theo mã
                  </Button>
                ) : code && issue ? (
                  issue.message
                ) : undefined
              }
            >
              <Select
                showSearch
                allowClear={field !== "stageId"}
                placeholder="Chưa có — chọn tay"
                filterOption={filterByLabel}
                value={current[field] || undefined}
                options={options[key]}
                onChange={(value: string | undefined) => choose(key, value ?? null)}
              />
            </Form.Item>
          );
        })}
      </div>
      <SharedVehiclesField
        control={control}
        setValue={setValue}
        getValues={getValues}
        entries={entries}
        dictionary={dictionary}
      />
    </div>
  );
}
