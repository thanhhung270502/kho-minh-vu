"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Form, Input, Radio, Skeleton, Switch } from "antd";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { errorCode, explainError } from "@/shared/lib/errors";

import {
  usePartnerDetail,
  useSavePartner,
  useSuggestedPartnerCode,
} from "../hooks/usePartners";
import {
  partnerSchema,
  type PartnerFormValues,
  type PartnerInput,
} from "../schemas/partner.schema";
import { PARTNER_KIND_LABELS, type PartnerKind } from "../types";

const EMPTY_FORM: PartnerFormValues = {
  code: "",
  name: "",
  kind: "KHACH",
  phone: "",
  email: "",
  address: "",
  region: "",
  taxCode: "",
  note: "",
  isActive: true,
};

type Props = { id: string | null; open: boolean; onClose: () => void };

export function PartnerDrawer({ id, open, onClose }: Props) {
  const { message } = App.useApp();
  const detail = usePartnerDetail(open ? id : null);
  const save = useSavePartner();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<PartnerFormValues, undefined, PartnerInput>({
    resolver: zodResolver(partnerSchema),
    defaultValues: EMPTY_FORM,
  });

  const kind = useWatch({ control, name: "kind" });
  const isNew = !id;

  // Dữ liệu chi tiết về sau khi mount → nạp lại form (CLAUDE.md Bước 5).
  useEffect(() => {
    if (!open) return;

    if (!id) {
      reset(EMPTY_FORM);
      return;
    }

    if (detail.data) {
      reset({
        code: detail.data.code,
        name: detail.data.name,
        kind: detail.data.kind,
        phone: detail.data.phone ?? "",
        email: detail.data.email ?? "",
        address: detail.data.address ?? "",
        region: detail.data.region ?? "",
        taxCode: detail.data.taxCode ?? "",
        note: detail.data.note ?? "",
        isActive: detail.data.isActive,
      });
    }
  }, [open, id, detail.data, reset]);

  // Gợi ý mã theo loại, nhưng không đè lên mã người dùng đã tự gõ.
  const suggestedCode = useSuggestedPartnerCode(kind as PartnerKind, open && isNew);
  useEffect(() => {
    if (!open || !isNew || !suggestedCode.data) return;
    if (getFieldState("code").isDirty) return;
    setValue("code", suggestedCode.data);
  }, [open, isNew, suggestedCode.data, getFieldState, setValue]);

  const onSave = handleSubmit(async (values) => {
    try {
      await save.mutateAsync({ id, values });
      message.success(isNew ? "Đã tạo đối tác" : "Đã lưu đối tác");
      onClose();
    } catch (error) {
      if (errorCode(error) === "23505") {
        setError("code", { message: "Mã này đã có. Dùng mã khác." });
        return;
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  return (
    <FormDrawer
      open={open}
      title={isNew ? "Thêm đối tác" : "Sửa đối tác"}
      saving={save.isPending}
      onClose={onClose}
      onSave={() => void onSave()}
    >
      {id && detail.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Form layout="vertical" onFinish={() => void onSave()}>
          {errors.root ? (
            <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
          ) : null}

          <Form.Item label="Loại đối tác">
            <Controller
              name="kind"
              control={control}
              render={({ field }) => (
                <Radio.Group {...field} optionType="button" buttonStyle="solid">
                  {(Object.keys(PARTNER_KIND_LABELS) as PartnerKind[]).map(
                    (option) => (
                      <Radio.Button key={option} value={option}>
                        {PARTNER_KIND_LABELS[option]}
                      </Radio.Button>
                    ),
                  )}
                </Radio.Group>
              )}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              label="Mã đối tác"
              validateStatus={errors.code ? "error" : undefined}
              help={
                errors.code?.message ?? (isNew ? "Gợi ý theo loại, sửa được" : undefined)
              }
            >
              <Controller
                name="code"
                control={control}
                render={({ field }) => <Input {...field} autoFocus={isNew} />}
              />
            </Form.Item>

            <Form.Item
              label="Điện thoại"
              validateStatus={errors.phone ? "error" : undefined}
              help={errors.phone?.message}
            >
              <Controller
                name="phone"
                control={control}
                render={({ field }) => <Input {...field} inputMode="tel" />}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Tên đối tác"
            validateStatus={errors.name ? "error" : undefined}
            help={errors.name?.message}
          >
            <Controller
              name="name"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              label="Email"
              validateStatus={errors.email ? "error" : undefined}
              help={errors.email?.message}
            >
              <Controller
                name="email"
                control={control}
                render={({ field }) => <Input {...field} inputMode="email" />}
              />
            </Form.Item>

            <Form.Item label="Khu vực">
              <Controller
                name="region"
                control={control}
                render={({ field }) => <Input {...field} />}
              />
            </Form.Item>
          </div>

          <Form.Item label="Địa chỉ">
            <Controller
              name="address"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item
            label="Mã số thuế"
            validateStatus={errors.taxCode ? "error" : undefined}
            help={errors.taxCode?.message}
          >
            <Controller
              name="taxCode"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item label="Ghi chú">
            <Controller
              name="note"
              control={control}
              render={({ field }) => <Input.TextArea {...field} rows={2} />}
            />
          </Form.Item>

          {!isNew ? (
            <Form.Item
              label="Đang hoạt động"
              help="Tắt để ngừng dùng đối tác này. Lịch sử giao dịch vẫn giữ nguyên."
            >
              <Controller
                name="isActive"
                control={control}
                render={({ field }) => (
                  <Switch checked={field.value} onChange={field.onChange} />
                )}
              />
            </Form.Item>
          ) : null}
        </Form>
      )}
    </FormDrawer>
  );
}
