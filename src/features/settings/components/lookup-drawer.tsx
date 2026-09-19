"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, ColorPicker, Form, Input, Select, Switch } from "antd";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { FormDrawer } from "@/shared/components/form-drawer";
import { explainError, isPostgrestError, errorCode } from "@/shared/lib/errors";

import {
  LOOKUP_TABLE_CONFIG,
  isSystemCode,
  type LookupTableName,
  type LookupValues,
  type LookupRow,
} from "../api/lookup.api";
import { useSaveLookupRow } from "../hooks/useLookups";

const schema = z.object({
  ma: z
    .string()
    .trim()
    .min(1, "Nhập mã")
    .max(20, "Mã tối đa 20 ký tự")
    .regex(/^[A-Za-z0-9_-]+$/, "Mã chỉ gồm chữ không dấu, số, _ và -")
    .transform((v) => v.toUpperCase()),
  ten: z.string().trim().min(1, "Nhập tên"),
  parent_id: z.string().nullable(),
  mau_hien_thi: z.string().nullable(),
  dia_chi: z.string().trim().nullable(),
  dang_hoat_dong: z.boolean(),
});

type LookupFormValues = z.infer<typeof schema>;

const EMPTY_FORM: LookupFormValues = {
  ma: "",
  ten: "",
  parent_id: null,
  mau_hien_thi: null,
  dia_chi: null,
  dang_hoat_dong: true,
};

type Props = {
  table: LookupTableName;
  row: LookupRow | null;
  open: boolean;
  allRows: LookupRow[];
  onClose: () => void;
};

export function LookupDrawer({ table, row, open, allRows, onClose }: Props) {
  const { message } = App.useApp();
  const config = LOOKUP_TABLE_CONFIG[table];
  const save = useSaveLookupRow(table);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<LookupFormValues>({ resolver: zodResolver(schema), defaultValues: EMPTY_FORM });

  useEffect(() => {
    if (!open) return;
    reset(
      row
        ? {
            ma: row.ma,
            ten: row.ten,
            parent_id: row.parent_id ?? null,
            mau_hien_thi: row.mau_hien_thi ?? null,
            dia_chi: row.dia_chi ?? null,
            dang_hoat_dong: row.dang_hoat_dong ?? true,
          }
        : EMPTY_FORM,
    );
  }, [open, row, reset]);

  // Nhóm cha: mọi nhóm khác trừ chính nó (ràng buộc thật ở migration 0040).
  const parentOptions = useMemo(
    () =>
      allRows
        .filter((item) => item.id !== row?.id)
        .map((item) => ({ value: item.id, label: `${item.ma} — ${item.ten}` })),
    [allRows, row?.id],
  );

  const onSave = handleSubmit(async (formValues) => {
    const values: LookupValues = { ma: formValues.ma, ten: formValues.ten };
    if (config.hasParent) values.parent_id = formValues.parent_id;
    if (config.hasColor) values.mau_hien_thi = formValues.mau_hien_thi;
    if (config.hasAddress) values.dia_chi = formValues.dia_chi || null;
    if (config.hasStatus) values.dang_hoat_dong = formValues.dang_hoat_dong;

    try {
      await save.mutateAsync({ id: row?.id ?? null, values });
      message.success(row ? `Đã lưu ${config.label}` : `Đã thêm ${config.label}`);
      onClose();
    } catch (error) {
      if (errorCode(error) === "23505") {
        setError("ma", { message: "Mã này đã có. Dùng mã khác." });
        return;
      }
      if (isPostgrestError(error) && error.code === "23514") {
        setError("ma", { message: error.message });
        return;
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  const codeLocked = Boolean(row && isSystemCode(table, row.ma));

  return (
    <FormDrawer
      open={open}
      title={`${row ? "Sửa" : "Thêm"} ${config.label}`}
      saving={save.isPending}
      onClose={onClose}
      onSave={() => void onSave()}
    >
      <Form layout="vertical" onFinish={() => void onSave()}>
        {errors.root ? (
          <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
        ) : null}

        <Form.Item
          label="Mã"
          validateStatus={errors.ma ? "error" : undefined}
          help={
            errors.ma?.message ??
            (codeLocked ? "Mã hệ thống — quy tắc rà dữ liệu dựa vào mã này." : undefined)
          }
        >
          <Controller
            name="ma"
            control={control}
            render={({ field }) => <Input {...field} disabled={codeLocked} autoFocus={!row} />}
          />
        </Form.Item>

        <Form.Item
          label="Tên"
          validateStatus={errors.ten ? "error" : undefined}
          help={errors.ten?.message}
        >
          <Controller name="ten" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>

        {config.hasParent ? (
          <Form.Item label="Nhóm cha" help="Để trống nếu đây là nhóm cấp một.">
            <Controller
              name="parent_id"
              control={control}
              render={({ field }) => (
                <Select
                  {...field}
                  allowClear
                  showSearch
                  optionFilterProp="label"
                  placeholder="Không có nhóm cha"
                  options={parentOptions}
                  onChange={(value) => field.onChange(value ?? null)}
                />
              )}
            />
          </Form.Item>
        ) : null}

        {config.hasColor ? (
          <Form.Item label="Màu hiển thị" help="Dùng cho thẻ công đoạn trong bảng danh mục.">
            <Controller
              name="mau_hien_thi"
              control={control}
              render={({ field }) => (
                <ColorPicker
                  value={field.value}
                  onChange={(color) => field.onChange(color.toHexString())}
                  showText
                />
              )}
            />
          </Form.Item>
        ) : null}

        {config.hasAddress ? (
          <Form.Item label="Địa chỉ">
            <Controller
              name="dia_chi"
              control={control}
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </Form.Item>
        ) : null}

        {config.hasStatus ? (
          <Form.Item
            label="Đang hoạt động"
            help="Tắt để ngừng dùng kho này. Tồn và chứng từ cũ vẫn giữ nguyên."
          >
            <Controller
              name="dang_hoat_dong"
              control={control}
              render={({ field }) => (
                <Switch checked={field.value} onChange={field.onChange} />
              )}
            />
          </Form.Item>
        ) : null}
      </Form>
    </FormDrawer>
  );
}
