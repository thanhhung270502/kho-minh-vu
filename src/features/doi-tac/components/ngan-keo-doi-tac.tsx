"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { App, Alert, Form, Input, Radio, Skeleton, Switch } from "antd";
import { useEffect } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { explainError, errorCode } from "@/shared/lib/errors";

import { useChiTietDoiTac, useGoiYMaDoiTac, useLuuDoiTac } from "../hooks/useDoiTac";
import { doiTacSchema, type DoiTacForm, type DoiTacLuu } from "../schemas/doi-tac.schema";
import { NHAN_LOAI_DOI_TAC, type LoaiDoiTac } from "../types";

const MAC_DINH: DoiTacForm = {
  ma: "",
  ten: "",
  loai: "KHACH",
  dien_thoai: "",
  email: "",
  dia_chi: "",
  khu_vuc: "",
  ma_so_thue: "",
  ghi_chu: "",
  dang_hoat_dong: true,
};

type Props = { id: string | null; open: boolean; onClose: () => void };

export function NganKeoDoiTac({ id, open, onClose }: Props) {
  const { message } = App.useApp();
  const chiTiet = useChiTietDoiTac(open ? id : null);
  const luu = useLuuDoiTac();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<DoiTacForm, undefined, DoiTacLuu>({
    resolver: zodResolver(doiTacSchema),
    defaultValues: MAC_DINH,
  });

  const loai = useWatch({ control, name: "loai" });
  const taoMoi = !id;

  // Dữ liệu chi tiết về sau khi mount → nạp lại form (CLAUDE.md Bước 5).
  useEffect(() => {
    if (!open) return;

    if (!id) {
      reset(MAC_DINH);
      return;
    }

    if (chiTiet.data) {
      reset({
        ma: chiTiet.data.ma,
        ten: chiTiet.data.ten,
        loai: chiTiet.data.loai,
        dien_thoai: chiTiet.data.dien_thoai ?? "",
        email: chiTiet.data.email ?? "",
        dia_chi: chiTiet.data.dia_chi ?? "",
        khu_vuc: chiTiet.data.khu_vuc ?? "",
        ma_so_thue: chiTiet.data.ma_so_thue ?? "",
        ghi_chu: chiTiet.data.ghi_chu ?? "",
        dang_hoat_dong: chiTiet.data.dang_hoat_dong,
      });
    }
  }, [open, id, chiTiet.data, reset]);

  // Gợi ý mã theo loại, nhưng không đè lên mã người dùng đã tự gõ.
  const maGoiY = useGoiYMaDoiTac(loai as LoaiDoiTac, open && taoMoi);
  useEffect(() => {
    if (!open || !taoMoi || !maGoiY.data) return;
    if (getFieldState("ma").isDirty) return;
    setValue("ma", maGoiY.data);
  }, [open, taoMoi, maGoiY.data, getFieldState, setValue]);

  const onSave = handleSubmit(async (v) => {
    try {
      await luu.mutateAsync({ id, giaTri: v });
      message.success(taoMoi ? "Đã tạo đối tác" : "Đã lưu đối tác");
      onClose();
    } catch (e) {
      if (errorCode(e) === "23505") {
        setError("ma", { message: "Mã này đã có. Dùng mã khác." });
        return;
      }
      const loi = explainError(e);
      setError("root", { message: `${loi.title}. ${loi.action}` });
    }
  });

  return (
    <FormDrawer
      open={open}
      title={taoMoi ? "Thêm đối tác" : "Sửa đối tác"}
      saving={luu.isPending}
      onClose={onClose}
      onSave={() => void onSave()}
    >
      {id && chiTiet.isPending ? (
        <Skeleton active paragraph={{ rows: 8 }} />
      ) : (
        <Form layout="vertical" onFinish={() => void onSave()}>
          {errors.root ? (
            <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
          ) : null}

          <Form.Item label="Loại đối tác">
            <Controller
              name="loai"
              control={control}
              render={({ field }) => (
                <Radio.Group {...field} optionType="button" buttonStyle="solid">
                  {(Object.keys(NHAN_LOAI_DOI_TAC) as LoaiDoiTac[]).map((l) => (
                    <Radio.Button key={l} value={l}>
                      {NHAN_LOAI_DOI_TAC[l]}
                    </Radio.Button>
                  ))}
                </Radio.Group>
              )}
            />
          </Form.Item>

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              label="Mã đối tác"
              validateStatus={errors.ma ? "error" : undefined}
              help={errors.ma?.message ?? (taoMoi ? "Gợi ý theo loại, sửa được" : undefined)}
            >
              <Controller
                name="ma"
                control={control}
                render={({ field }) => <Input {...field} autoFocus={taoMoi} />}
              />
            </Form.Item>

            <Form.Item
              label="Điện thoại"
              validateStatus={errors.dien_thoai ? "error" : undefined}
              help={errors.dien_thoai?.message}
            >
              <Controller
                name="dien_thoai"
                control={control}
                render={({ field }) => <Input {...field} inputMode="tel" />}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Tên đối tác"
            validateStatus={errors.ten ? "error" : undefined}
            help={errors.ten?.message}
          >
            <Controller name="ten" control={control} render={({ field }) => <Input {...field} />} />
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
                name="khu_vuc"
                control={control}
                render={({ field }) => <Input {...field} />}
              />
            </Form.Item>
          </div>

          <Form.Item label="Địa chỉ">
            <Controller
              name="dia_chi"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item
            label="Mã số thuế"
            validateStatus={errors.ma_so_thue ? "error" : undefined}
            help={errors.ma_so_thue?.message}
          >
            <Controller
              name="ma_so_thue"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>

          <Form.Item label="Ghi chú">
            <Controller
              name="ghi_chu"
              control={control}
              render={({ field }) => <Input.TextArea {...field} rows={2} />}
            />
          </Form.Item>

          {!taoMoi ? (
            <Form.Item
              label="Đang hoạt động"
              help="Tắt để ngừng dùng đối tác này. Lịch sử giao dịch vẫn giữ nguyên."
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
      )}
    </FormDrawer>
  );
}
