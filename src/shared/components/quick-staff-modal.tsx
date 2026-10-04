"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Form, Input, Modal } from "antd";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import {
  staffSchema,
  type StaffFormValues,
} from "@/shared/schemas/staff.schema";
import type { InternalRecipientOption } from "@/shared/api/internal-recipient.api";
import { useCreateInternalRecipient } from "@/shared/hooks/use-create-internal-recipient";
import { errorCode, explainError } from "@/shared/lib/errors";

type Props = {
  open: boolean;
  /** Chữ đang gõ ở ô chọn — điền sẵn cho cả hai tên. */
  initialName: string;
  onClose: () => void;
  onCreated: (person: InternalRecipientOption) => void;
};

function emptyForm(typed: string): StaffFormValues {
  const name = typed.trim();
  // Tên viết tắt mặc định = chữ cuối ("Ngô Kiến Huy" → "Huy"), sửa được.
  return {
    fullName: name,
    shortName: name.split(/\s+/).at(-1) ?? name,
    isActive: true,
  };
}

/** Thêm nhân viên phụ trách ngay tại ô người nhận, không phải sang Cài đặt. */
export function QuickStaffModal({
  open,
  initialName,
  onClose,
  onCreated,
}: Props) {
  const create = useCreateInternalRecipient();
  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StaffFormValues>({
    resolver: zodResolver(staffSchema),
    defaultValues: emptyForm(initialName),
  });

  // Mỗi lần mở là một lượt tạo mới — nạp lại tên vừa gõ (CLAUDE.md Bước 5).
  useEffect(() => {
    if (open) reset(emptyForm(initialName));
  }, [open, initialName, reset]);

  function close() {
    if (create.isPending) return;
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      onCreated(
        await create.mutateAsync({
          shortName: values.shortName,
          fullName: values.fullName,
        }),
      );
    } catch (error) {
      const code = errorCode(error);
      if (code === "23505") {
        setError("shortName", {
          message:
            "Tên viết tắt này đã có — chọn người đó trong danh sách hoặc đổi tên khác",
        });
        return;
      }
      if (code === "42501") {
        setError("root", {
          message:
            "Tài khoản chưa có quyền Tạo nhân viên. Nhờ quản lý bật quyền ở Cài đặt → Chức vụ.",
        });
        return;
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  return (
    <Modal
      open={open}
      title="Thêm nhân viên phụ trách"
      okText="Thêm"
      cancelText="Hủy"
      confirmLoading={create.isPending}
      onOk={() => void onSubmit()}
      onCancel={close}
      mask={{ closable: !create.isPending }}
      destroyOnHidden
    >
      {errors.root ? (
        <Alert
          className="mb-3"
          type="error"
          showIcon
          title={errors.root.message}
        />
      ) : null}
      <Form layout="vertical" onFinish={() => void onSubmit()}>
        <Form.Item
          label="Tên đầy đủ"
          validateStatus={errors.fullName ? "error" : undefined}
          help={errors.fullName?.message}
        >
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => <Input {...field} autoFocus />}
          />
        </Form.Item>
        <Form.Item
          label="Tên viết tắt"
          validateStatus={errors.shortName ? "error" : undefined}
          help={
            errors.shortName?.message ??
            "Gõ tên này ở ô người nhận là ra ngay. Không được trùng."
          }
        >
          <Controller
            name="shortName"
            control={control}
            render={({ field }) => (
              <Input {...field} onPressEnter={() => void onSubmit()} />
            )}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
