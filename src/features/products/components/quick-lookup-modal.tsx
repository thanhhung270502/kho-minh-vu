"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Form, Input, Modal } from "antd";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { errorCode, explainError } from "@/shared/lib/errors";

import type { QuickLookupTable } from "../api/quick-lookup.api";
import { useCreateQuickLookup } from "../hooks/useQuickLookup";
import {
  quickLookupSchema,
  suggestLookupCode,
  type QuickLookupValues,
} from "../schemas/quick-lookup.schema";

type Props = {
  table: QuickLookupTable;
  /** "nhóm hàng", "đơn vị tính", "công đoạn" — chữ thường, ghép vào câu. */
  label: string;
  open: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (id: string) => void;
};

export function QuickLookupModal({ table, label, open, initialName, onClose, onCreated }: Props) {
  const create = useCreateQuickLookup(table);
  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getValues,
    formState: { errors, dirtyFields },
  } = useForm<QuickLookupValues>({
    resolver: zodResolver(quickLookupSchema),
    defaultValues: { code: "", name: "" },
  });

  useEffect(() => {
    if (!open) return;
    const name = initialName.trim();
    reset({ name, code: suggestLookupCode(name) });
  }, [open, initialName, reset]);

  const onSave = handleSubmit(async (values) => {
    try {
      onCreated(await create.mutateAsync(values));
    } catch (error) {
      if (errorCode(error) === "23505") {
        setError("code", { message: "Mã này đã có. Chọn trong danh sách hoặc dùng mã khác." });
        return;
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  return (
    <Modal
      open={open}
      title={`Thêm ${label}`}
      okText="Thêm"
      cancelText="Thôi"
      confirmLoading={create.isPending}
      destroyOnHidden
      onOk={() => void onSave()}
      onCancel={onClose}
    >
      <Form layout="vertical" onFinish={() => void onSave()}>
        {errors.root ? (
          <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
        ) : null}
        <Form.Item label="Tên" validateStatus={errors.name ? "error" : undefined} help={errors.name?.message}>
          <Controller
            name="name"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                autoFocus
                onChange={(event) => {
                  field.onChange(event);
                  // Mã đi theo tên cho tới khi người dùng tự sửa mã.
                  if (!dirtyFields.code) setValue("code", suggestLookupCode(event.target.value));
                }}
              />
            )}
          />
        </Form.Item>
        <Form.Item
          label="Mã"
          validateStatus={errors.code ? "error" : undefined}
          help={errors.code?.message ?? "Tự gợi ý từ tên. Muốn đổi màu, nhóm cha… vào Danh mục phụ."}
        >
          <Controller
            name="code"
            control={control}
            render={({ field }) => (
              <Input
                {...field}
                onChange={(event) => setValue("code", event.target.value, { shouldDirty: true })}
                onBlur={() => setValue("code", getValues("code").toUpperCase(), { shouldDirty: true })}
              />
            )}
          />
        </Form.Item>
        {/* Enter trong ô cũng gửi form: antd Form chỉ bắt submit khi có nút submit. */}
        <button type="submit" hidden aria-hidden />
      </Form>
    </Modal>
  );
}
