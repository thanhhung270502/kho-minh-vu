"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, ColorPicker, Form, Input, Select, Switch } from "antd";
import { useEffect, useMemo } from "react";
import { Controller, useForm } from "react-hook-form";
import { z } from "zod";

import { NganKeoForm } from "@/shared/components/ngan-keo-form";
import { dienGiaiLoi, laLoiPostgrest, maLoi } from "@/shared/lib/errors";

import {
  CAU_HINH_DANH_MUC_PHU,
  laMaHeThong,
  type BangDanhMucPhu,
  type GiaTriDanhMucPhu,
  type MucDanhMucPhu,
} from "../api/danh-muc-phu.api";
import { useLuuDanhMucPhu } from "../hooks/useDanhMucPhu";

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

type FormDanhMucPhu = z.infer<typeof schema>;

const MAC_DINH: FormDanhMucPhu = {
  ma: "",
  ten: "",
  parent_id: null,
  mau_hien_thi: null,
  dia_chi: null,
  dang_hoat_dong: true,
};

type Props = {
  bang: BangDanhMucPhu;
  muc: MucDanhMucPhu | null;
  open: boolean;
  danhSach: MucDanhMucPhu[];
  onDong: () => void;
};

export function NganKeoDanhMucPhu({ bang, muc, open, danhSach, onDong }: Props) {
  const { message } = App.useApp();
  const cauHinh = CAU_HINH_DANH_MUC_PHU[bang];
  const luu = useLuuDanhMucPhu(bang);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormDanhMucPhu>({ resolver: zodResolver(schema), defaultValues: MAC_DINH });

  useEffect(() => {
    if (!open) return;
    reset(
      muc
        ? {
            ma: muc.ma,
            ten: muc.ten,
            parent_id: muc.parent_id ?? null,
            mau_hien_thi: muc.mau_hien_thi ?? null,
            dia_chi: muc.dia_chi ?? null,
            dang_hoat_dong: muc.dang_hoat_dong ?? true,
          }
        : MAC_DINH,
    );
  }, [open, muc, reset]);

  // Nhóm cha: mọi nhóm khác trừ chính nó (ràng buộc thật ở migration 0040).
  const nhomCha = useMemo(
    () =>
      danhSach
        .filter((d) => d.id !== muc?.id)
        .map((d) => ({ value: d.id, label: `${d.ma} — ${d.ten}` })),
    [danhSach, muc?.id],
  );

  const onLuu = handleSubmit(async (v) => {
    const giaTri: GiaTriDanhMucPhu = { ma: v.ma, ten: v.ten };
    if (cauHinh.coCha) giaTri.parent_id = v.parent_id;
    if (cauHinh.coMau) giaTri.mau_hien_thi = v.mau_hien_thi;
    if (cauHinh.coDiaChi) giaTri.dia_chi = v.dia_chi || null;
    if (cauHinh.coTrangThai) giaTri.dang_hoat_dong = v.dang_hoat_dong;

    try {
      await luu.mutateAsync({ id: muc?.id ?? null, giaTri });
      message.success(muc ? `Đã lưu ${cauHinh.nhan}` : `Đã thêm ${cauHinh.nhan}`);
      onDong();
    } catch (e) {
      if (maLoi(e) === "23505") {
        setError("ma", { message: "Mã này đã có. Dùng mã khác." });
        return;
      }
      if (laLoiPostgrest(e) && e.code === "23514") {
        setError("ma", { message: e.message });
        return;
      }
      const loi = dienGiaiLoi(e);
      setError("root", { message: `${loi.tieuDe}. ${loi.huongXuLy}` });
    }
  });

  const khoaMa = Boolean(muc && laMaHeThong(bang, muc.ma));

  return (
    <NganKeoForm
      open={open}
      tieuDe={`${muc ? "Sửa" : "Thêm"} ${cauHinh.nhan}`}
      dangLuu={luu.isPending}
      onDong={onDong}
      onLuu={() => void onLuu()}
    >
      <Form layout="vertical" onFinish={() => void onLuu()}>
        {errors.root ? (
          <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
        ) : null}

        <Form.Item
          label="Mã"
          validateStatus={errors.ma ? "error" : undefined}
          help={
            errors.ma?.message ??
            (khoaMa ? "Mã hệ thống — quy tắc rà dữ liệu dựa vào mã này." : undefined)
          }
        >
          <Controller
            name="ma"
            control={control}
            render={({ field }) => <Input {...field} disabled={khoaMa} autoFocus={!muc} />}
          />
        </Form.Item>

        <Form.Item
          label="Tên"
          validateStatus={errors.ten ? "error" : undefined}
          help={errors.ten?.message}
        >
          <Controller name="ten" control={control} render={({ field }) => <Input {...field} />} />
        </Form.Item>

        {cauHinh.coCha ? (
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
                  options={nhomCha}
                  onChange={(v) => field.onChange(v ?? null)}
                />
              )}
            />
          </Form.Item>
        ) : null}

        {cauHinh.coMau ? (
          <Form.Item label="Màu hiển thị" help="Dùng cho thẻ công đoạn trong bảng danh mục.">
            <Controller
              name="mau_hien_thi"
              control={control}
              render={({ field }) => (
                <ColorPicker
                  value={field.value}
                  onChange={(c) => field.onChange(c.toHexString())}
                  showText
                />
              )}
            />
          </Form.Item>
        ) : null}

        {cauHinh.coDiaChi ? (
          <Form.Item label="Địa chỉ">
            <Controller
              name="dia_chi"
              control={control}
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </Form.Item>
        ) : null}

        {cauHinh.coTrangThai ? (
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
    </NganKeoForm>
  );
}
