"use client";

import { Form, Select } from "antd";
import { Controller, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form";

import { SCOPE_LABELS, type Role } from "@/shared/lib/permissions";

import { useJobTitles } from "../hooks/useJobTitles";

type Values = { jobTitleId: string; role: Role };

type Props<T extends Values> = {
  control: Control<T>;
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
};

/**
 * Ô Chức vụ của form người dùng (QUYEN-02). Chọn chức vụ thì form tự điền
 * `role` = phạm vi của chức vụ — để hiện ô kho cho thủ kho và khóa công tắc
 * riêng của quản lý. Server đọc lại phạm vi từ DB, không tin giá trị này.
 */
export function UserJobTitleField<T extends Values>({ control, errors, setValue }: Props<T>) {
  const titles = useJobTitles();
  // Generic react-hook-form: ép về form tối thiểu chỉ ở đây, nơi duy nhất cần.
  const narrowControl = control as unknown as Control<Values>;
  const narrowSetValue = setValue as unknown as UseFormSetValue<Values>;
  const error = (errors as FieldErrors<Values>).jobTitleId;

  return (
    <Form.Item
      label="Chức vụ"
      validateStatus={error ? "error" : undefined}
      help={error?.message ?? "Quyền của chức vụ sửa ở Cài đặt › Chức vụ."}
    >
      <Controller
        name="jobTitleId"
        control={narrowControl}
        render={({ field }) => (
          <Select
            value={field.value || undefined}
            placeholder="Chọn chức vụ"
            loading={titles.isPending}
            status={titles.isError ? "error" : undefined}
            notFoundContent={titles.isError ? "Không tải được danh sách chức vụ. Đóng rồi mở lại form." : undefined}
            options={(titles.data ?? []).map((t) => ({
              value: t.id,
              label: (
                <span>
                  {t.name} <span className="text-xs text-chu-phu">· {SCOPE_LABELS[t.scope]}</span>
                </span>
              ),
            }))}
            onChange={(id: string) => {
              field.onChange(id);
              const scope = titles.data?.find((t) => t.id === id)?.scope;
              if (scope) narrowSetValue("role", scope, { shouldValidate: false });
            }}
          />
        )}
      />
    </Form.Item>
  );
}
