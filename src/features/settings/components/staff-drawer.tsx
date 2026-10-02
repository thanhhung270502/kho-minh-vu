"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Form, Input, Switch } from "antd";
import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { errorCode, explainError } from "@/shared/lib/errors";

import type { StaffRow } from "../api/staff.api";
import { useSaveStaff } from "../hooks/useStaff";
import { staffSchema, type StaffFormValues } from "../schemas/staff.schema";

const EMPTY_FORM: StaffFormValues = { shortName: "", fullName: "", isActive: true };

type Props = { row: StaffRow | null; open: boolean; onClose: () => void };

export function StaffDrawer({ row, open, onClose }: Props) {
  const { message } = App.useApp();
  const save = useSaveStaff();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<StaffFormValues>({ resolver: zodResolver(staffSchema), defaultValues: EMPTY_FORM });

  useEffect(() => {
    if (!open) return;
    reset(
      row
        ? { shortName: row.shortName, fullName: row.fullName, isActive: row.isActive }
        : EMPTY_FORM,
    );
  }, [open, row, reset]);

  const onSave = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id: row?.id ?? null, values });
      message.success(row ? "Đã lưu nhân viên" : `Đã thêm ${values.fullName}`);
      onClose();
    } catch (error) {
      // Unique index trên tên viết tắt (0077) — báo đúng ô, giữ nguyên dữ liệu đã nhập.
      if (errorCode(error) === "23505") {
        setError("shortName", { message: "Tên viết tắt này đã có. Dùng tên khác." });
        return;
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  return (
    <FormDrawer
      open={open}
      title={row ? "Sửa nhân viên phụ trách" : "Thêm nhân viên phụ trách"}
      saving={save.isPending}
      onClose={onClose}
      onSave={() => void onSave()}
    >
      <Form layout="vertical" onFinish={() => void onSave()}>
        {errors.root ? (
          <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
        ) : null}

        <Form.Item
          label="Tên viết tắt"
          validateStatus={errors.shortName ? "error" : undefined}
          help={errors.shortName?.message ?? "Gõ tên này để chọn nhanh khi đặt hàng."}
        >
          <Controller
            name="shortName"
            control={control}
            render={({ field }) => <Input {...field} autoFocus={!row} />}
          />
        </Form.Item>

        <Form.Item
          label="Tên đầy đủ"
          validateStatus={errors.fullName ? "error" : undefined}
          help={errors.fullName?.message ?? "Hiện trên đơn, hóa đơn và phiếu in."}
        >
          <Controller name="fullName" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>

        <Form.Item
          label="Đang dùng"
          help="Tắt để ẩn khỏi ô chọn người nhận. Đơn và hóa đơn cũ vẫn giữ tên."
        >
          <Controller
            name="isActive"
            control={control}
            render={({ field }) => <Switch checked={field.value} onChange={field.onChange} />}
          />
        </Form.Item>
      </Form>
    </FormDrawer>
  );
}
