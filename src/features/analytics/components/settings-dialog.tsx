"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Button, Form, InputNumber, Modal } from "antd";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { explainError, isPostgrestError } from "@/shared/lib/errors";

import { useSaveAnalysisSettings } from "../hooks/useAnalytics";
import { settingsSchema, type SettingsFormValues } from "../schemas/settings.schema";
import type { AnalysisSettings } from "../types";

const FIELDS: { name: keyof SettingsFormValues; label: string; help: string }[] = [
  { name: "redDays", label: "Ngưỡng đỏ (ngày)", help: "Còn ít hơn hoặc bằng số ngày này: cần nhập ngay." },
  { name: "yellowDays", label: "Ngưỡng vàng (ngày)", help: "Còn ít hơn hoặc bằng: chuẩn bị nhập — cũng là X của “Sắp hết”." },
  { name: "coverDays", label: "Nhập đủ bán (ngày)", help: "Y trong đề nghị nhập = ⌈bán TB/ngày × Y − khả dụng⌉." },
];

/** Ngưỡng dùng chung toàn hệ thống — chỉ quản lý sửa (RLS 0079). */
export function SettingsDialog({ settings }: { settings: AnalysisSettings }) {
  const { message } = App.useApp();
  const [open, setOpen] = useState(false);
  const save = useSaveAnalysisSettings();
  const { control, handleSubmit, reset, setError, formState: { errors } } = useForm<SettingsFormValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: settings,
  });

  useEffect(() => {
    if (open) reset(settings);
  }, [open, settings, reset]);

  const onSave = handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      message.success("Đã lưu ngưỡng — áp dụng cho mọi người.");
      setOpen(false);
    } catch (error) {
      // Lỗi PostgREST là object thường (bẫy 8); lỗi "0 dòng" của văn phòng là Error do api ném.
      if (!isPostgrestError(error) && error instanceof Error) {
        setError("root", { message: error.message });
        return;
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  return (
    <>
      <Button onClick={() => setOpen(true)}>Ngưỡng</Button>
      <Modal
        open={open}
        title="Ngưỡng phân tích"
        okText="Lưu"
        cancelText="Thôi"
        confirmLoading={save.isPending}
        onOk={() => void onSave()}
        onCancel={() => !save.isPending && setOpen(false)}
      >
        {errors.root ? <Alert className="mb-3" type="error" showIcon title={errors.root.message} /> : null}
        <Form layout="vertical">
          {FIELDS.map((f) => (
            <Form.Item
              key={f.name}
              label={f.label}
              validateStatus={errors[f.name] ? "error" : undefined}
              help={errors[f.name]?.message ?? f.help}
            >
              <Controller
                name={f.name}
                control={control}
                render={({ field }) => (
                  <InputNumber
                    className="w-full"
                    min={1}
                    max={365}
                    value={field.value}
                    onChange={(v) => field.onChange(v ?? undefined)}
                  />
                )}
              />
            </Form.Item>
          ))}
        </Form>
      </Modal>
    </>
  );
}
