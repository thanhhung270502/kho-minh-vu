"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Checkbox, Form, Input, Radio, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";

import { NganKeoForm } from "@/shared/components/ngan-keo-form";
import { chuanHoaTenDangNhap } from "@/shared/lib/chuan-hoa";
import { NHAN_VAI_TRO, type VaiTro } from "@/shared/lib/quyen";

import { capNhatNguoiDung, taoNguoiDung } from "../actions/nguoi-dung.actions";
import {
  khoaKhoHoatDong,
  khoaNguoiDung,
  khoCuaNguoiDung,
  layKhoHoatDong,
  type DongNguoiDung,
} from "../api/nguoi-dung.api";
import {
  formSuaNguoiDungSchema,
  formTaoNguoiDungSchema,
  VAI_TRO,
} from "../schemas/nguoi-dung.schema";
import { OMatKhauTam, sinhMatKhauTam } from "./o-mat-khau-tam";

const MO_TA_VAI_TRO: Record<VaiTro, string> = {
  quan_ly: "Toàn quyền, kể cả Cài đặt và giá bán",
  van_phong: "Sửa danh mục, đối tác, xem giá vốn",
  thu_kho: "Chỉ kho được gán, không xem giá vốn",
  chi_xem: "Xem, không tạo hay sửa gì",
};

type FormNguoiDung = {
  hoTen: string;
  tenDangNhap: string;
  vaiTro: VaiTro;
  khoIds: string[];
  matKhauTam: string;
};

type Props = { open: boolean; nguoiDung: DongNguoiDung | null; onDong: () => void };

export function NganKeoNguoiDung({ open, nguoiDung, onDong }: Props) {
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [dangChay, batDau] = useTransition();
  const kho = useQuery({ queryKey: khoaKhoHoatDong, queryFn: layKhoHoatDong });

  const taoMoi = !nguoiDung;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<FormNguoiDung>({
    // Hai schema khác nhau: tạo mới cần tên đăng nhập + mật khẩu tạm, sửa thì
    // không (và cũng không có `id` trong form — id lấy từ dòng bảng).
    resolver: zodResolver(
      taoMoi ? formTaoNguoiDungSchema : formSuaNguoiDungSchema,
    ) as unknown as Resolver<FormNguoiDung>,
    defaultValues: {
      hoTen: "",
      tenDangNhap: "",
      vaiTro: "thu_kho",
      khoIds: [],
      matKhauTam: "",
    },
  });

  useEffect(() => {
    if (!open) return;

    reset(
      nguoiDung
        ? {
            hoTen: nguoiDung.ho_ten,
            tenDangNhap: nguoiDung.ten_dang_nhap ?? "",
            vaiTro: nguoiDung.vai_tro,
            khoIds: khoCuaNguoiDung(nguoiDung).map((k) => k.id),
            matKhauTam: "",
          }
        : {
            hoTen: "",
            tenDangNhap: "",
            vaiTro: "thu_kho",
            khoIds: [],
            matKhauTam: sinhMatKhauTam(),
          },
    );
  }, [open, nguoiDung, reset]);

  const vaiTro = useWatch({ control, name: "vaiTro" });
  const tenDangNhap = useWatch({ control, name: "tenDangNhap" });

  const onLuu = handleSubmit((v) => {
    batDau(async () => {
      const kq = nguoiDung
        ? await capNhatNguoiDung({
            id: nguoiDung.id,
            hoTen: v.hoTen,
            vaiTro: v.vaiTro,
            khoIds: v.vaiTro === "thu_kho" ? v.khoIds : [],
          })
        : await taoNguoiDung({
            hoTen: v.hoTen,
            tenDangNhap: v.tenDangNhap,
            vaiTro: v.vaiTro,
            khoIds: v.vaiTro === "thu_kho" ? v.khoIds : [],
            matKhauTam: v.matKhauTam,
          });

      if (!kq.ok) {
        if (kq.truong) {
          setError(kq.truong as keyof FormNguoiDung, { message: kq.thongBao });
        } else {
          setError("root", { message: kq.thongBao });
        }
        return;
      }

      void queryClient.invalidateQueries({ queryKey: khoaNguoiDung });

      if (taoMoi) {
        message.success(`Đã tạo tài khoản ${chuanHoaTenDangNhap(v.tenDangNhap)}`);
      } else {
        const doiVaiTro = nguoiDung.vai_tro !== v.vaiTro;
        const khoCu = khoCuaNguoiDung(nguoiDung).map((k) => k.id);
        const doiKho =
          khoCu.length !== v.khoIds.length || khoCu.some((k) => !v.khoIds.includes(k));

        if (doiVaiTro || doiKho) {
          notification.info({
            message: "Đã lưu",
            description:
              "Quyền bị thu hẹp có hiệu lực ngay. Quyền được mở rộng có hiệu lực khi nhân viên tải lại trang hoặc trong tối đa 60 phút.",
          });
        } else {
          message.success("Đã lưu tài khoản");
        }
      }

      onDong();
    });
  });

  return (
    <NganKeoForm
      open={open}
      tieuDe={taoMoi ? "Thêm tài khoản" : "Sửa tài khoản"}
      dangLuu={dangChay}
      onDong={onDong}
      onLuu={() => void onLuu()}
    >
      <Form layout="vertical" onFinish={() => void onLuu()}>
        {errors.root ? (
          <Alert className="mb-4" type="error" showIcon message={errors.root.message} />
        ) : null}

        <Form.Item
          label="Họ tên"
          validateStatus={errors.hoTen ? "error" : undefined}
          help={errors.hoTen?.message}
        >
          <Controller
            name="hoTen"
            control={control}
            render={({ field }) => <Input {...field} autoFocus />}
          />
        </Form.Item>

        {taoMoi ? (
          <Form.Item
            label="Tên đăng nhập"
            validateStatus={errors.tenDangNhap ? "error" : undefined}
            help={
              errors.tenDangNhap?.message ?? (
                <span>
                  Nhân viên gõ đúng tên này khi đăng nhập
                  {tenDangNhap ? (
                    <>
                      {" — sẽ lưu thành "}
                      <code>{chuanHoaTenDangNhap(tenDangNhap)}</code>
                    </>
                  ) : null}
                </span>
              )
            }
          >
            <Controller
              name="tenDangNhap"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>
        ) : (
          <Form.Item label="Tên đăng nhập">
            <Typography.Text className="font-mono">
              {nguoiDung.ten_dang_nhap ?? "(chưa đặt)"}
            </Typography.Text>
            <br />
            <Typography.Text type="secondary">
              Tên đăng nhập không đổi được. Cần đổi thì tạo tài khoản mới và vô hiệu hóa
              tài khoản này.
            </Typography.Text>
          </Form.Item>
        )}

        <Form.Item
          label="Vai trò"
          validateStatus={errors.vaiTro ? "error" : undefined}
          help={errors.vaiTro?.message}
        >
          <Controller
            name="vaiTro"
            control={control}
            render={({ field }) => (
              <Radio.Group {...field} className="flex flex-col gap-2">
                {VAI_TRO.map((v) => (
                  <Radio key={v} value={v}>
                    {NHAN_VAI_TRO[v]}
                    <div className="text-xs text-gray-500">{MO_TA_VAI_TRO[v]}</div>
                  </Radio>
                ))}
              </Radio.Group>
            )}
          />
        </Form.Item>

        {vaiTro === "thu_kho" ? (
          <Form.Item
            label="Kho được vào"
            validateStatus={errors.khoIds ? "error" : undefined}
            help={errors.khoIds?.message ?? "Thủ kho chỉ thấy tồn và phiếu của kho được gán."}
          >
            <Controller
              name="khoIds"
              control={control}
              render={({ field }) => (
                <Checkbox.Group
                  value={field.value}
                  onChange={field.onChange}
                  options={(kho.data ?? []).map((k) => ({ value: k.id, label: k.ten }))}
                />
              )}
            />
          </Form.Item>
        ) : null}

        {taoMoi ? (
          <Form.Item
            label="Mật khẩu tạm"
            validateStatus={errors.matKhauTam ? "error" : undefined}
            help={
              errors.matKhauTam?.message ??
              "Đưa mật khẩu này tận tay nhân viên. Họ phải đổi ở lần đăng nhập đầu."
            }
          >
            <Controller
              name="matKhauTam"
              control={control}
              render={({ field }) => (
                <OMatKhauTam value={field.value} onChange={field.onChange} />
              )}
            />
          </Form.Item>
        ) : null}
      </Form>
    </NganKeoForm>
  );
}
