"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Form, Input, Select } from "antd";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";
import { SCOPE_LABELS } from "@/shared/lib/permissions";

import type { JobTitle } from "../api/job-title.api";
import { useSaveJobTitle } from "../hooks/useJobTitles";
import { jobTitleSchema, type JobTitleFormValues } from "../schemas/job-title.schema";
import { ROLES } from "../schemas/user.schema";

const EMPTY_FORM: JobTitleFormValues = { name: "", scope: "van_phong" };

type Props = { row: JobTitle | null; open: boolean; onClose: () => void };

/** Tên + phạm vi của chức vụ. 9 quyền bật/tắt thẳng trên bảng, không qua form này. */
export function JobTitleDrawer({ row, open, onClose }: Props) {
  const { message } = App.useApp();
  const save = useSaveJobTitle();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<JobTitleFormValues>({ resolver: zodResolver(jobTitleSchema), defaultValues: EMPTY_FORM });

  useEffect(() => {
    if (!open) return;
    reset(row ? { name: row.name, scope: row.scope } : EMPTY_FORM);
  }, [open, row, reset]);

  const onSave = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: row?.id ?? null, values });
      message.success(row ? "Đã lưu chức vụ" : `Đã thêm chức vụ ${values.name.trim()}`);
      onClose();
    } catch (error) {
      if (errorCode(error) === "23505") {
        setError("name", { message: "Đã có chức vụ trùng tên. Dùng tên khác." });
        return;
      }
      // Trigger 0082 soạn sẵn câu: mất quản lý cuối cùng / thủ kho chưa có kho.
      if (isPostgrestError(error) && error.code === "23514") {
        setError("scope", { message: error.message });
        return;
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  return (
    <FormDrawer
      open={open}
      title={row ? "Sửa chức vụ" : "Thêm chức vụ"}
      saving={save.isPending}
      onClose={onClose}
      onSave={() => void onSave()}
    >
      <Form layout="vertical" onFinish={() => void onSave()}>
        {errors.root ? <Alert className="mb-4" type="error" showIcon title={errors.root.message} /> : null}

        <Form.Item label="Tên chức vụ" validateStatus={errors.name ? "error" : undefined} help={errors.name?.message}>
          <Controller name="name" control={control} render={({ field }) => <Input {...field} autoFocus={!row} />} />
        </Form.Item>

        <Form.Item
          label="Phạm vi"
          validateStatus={errors.scope ? "error" : undefined}
          help={
            errors.scope?.message ??
            "Phạm vi quyết định thấy kho nào và có vào được quản trị tài khoản không. Đổi phạm vi có hiệu lực khi người dùng tải lại trang (tối đa 60 phút)."
          }
        >
          <Controller
            name="scope"
            control={control}
            render={({ field }) => (
              <Select
                {...field}
                options={ROLES.map((role) => ({ value: role, label: SCOPE_LABELS[role] }))}
              />
            )}
          />
        </Form.Item>
      </Form>
    </FormDrawer>
  );
}
