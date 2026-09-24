"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Checkbox, Form, Input, Radio, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { normalizeUsername } from "@/shared/lib/text";
import { ROLE_LABELS, type Role } from "@/shared/lib/permissions";

import { updateUser, createUser } from "../actions/user.actions";
import {
  activeWarehouseKey,
  userListKey,
  userWarehouses,
  fetchActiveWarehouses,
  type UserRow,
} from "../api/user.api";
import {
  editUserFormSchema,
  createUserFormSchema,
  ROLES,
} from "../schemas/user.schema";
import { TempPasswordField, generateTempPassword } from "./temp-password-field";
import { UserSpecialPermissions } from "./user-special-permissions";

const MO_TA_VAI_TRO: Record<Role, string> = {
  quan_ly: "Toàn quyền, kể cả Cài đặt và giá bán",
  van_phong: "Sửa danh mục, đối tác, xem giá vốn",
  thu_kho: "Chỉ kho được gán, không xem giá vốn",
  chi_xem: "Xem, không tạo hay sửa gì",
};

type UserFormValues = {
  fullName: string;
  username: string;
  role: Role;
  warehouseIds: string[];
  tempPassword: string;
  viewKiotVietHistory: boolean;
  approveStocktake: boolean;
};

type Props = { open: boolean; user: UserRow | null; onClose: () => void };

export function UserDrawer({ open, user, onClose }: Props) {
  const { message, notification } = App.useApp();
  const queryClient = useQueryClient();
  const [dangChay, batDau] = useTransition();
  const warehouses = useQuery({ queryKey: activeWarehouseKey, queryFn: fetchActiveWarehouses });

  const isNew = !user;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<UserFormValues>({
    // Hai schema khác nhau: tạo mới cần tên đăng nhập + mật khẩu tạm, sửa thì
    // không (và cũng không có `id` trong form — id lấy từ dòng bảng).
    resolver: zodResolver(
      isNew ? createUserFormSchema : editUserFormSchema,
    ) as unknown as Resolver<UserFormValues>,
    defaultValues: {
      fullName: "",
      username: "",
      role: "thu_kho",
      warehouseIds: [],
      tempPassword: "",
      viewKiotVietHistory: false,
      approveStocktake: false,
    },
  });

  useEffect(() => {
    if (!open) return;

    reset(
      user
        ? {
            fullName: user.ho_ten,
            username: user.ten_dang_nhap ?? "",
            role: user.vai_tro,
            warehouseIds: userWarehouses(user).map((k) => k.id),
            tempPassword: "",
            viewKiotVietHistory: user.xem_lich_su_kiotviet,
            approveStocktake: user.duyet_kiem_ke,
          }
        : {
            fullName: "",
            username: "",
            role: "thu_kho",
            warehouseIds: [],
            tempPassword: generateTempPassword(),
            viewKiotVietHistory: false,
            approveStocktake: false,
          },
    );
  }, [open, user, reset]);

  const role = useWatch({ control, name: "role" });
  const username = useWatch({ control, name: "username" });

  const onSave = handleSubmit((v) => {
    batDau(async () => {
      const kq = user
        ? await updateUser({
            id: user.id,
            fullName: v.fullName,
            role: v.role,
            warehouseIds: v.role === "thu_kho" ? v.warehouseIds : [],
            viewKiotVietHistory: v.viewKiotVietHistory,
            approveStocktake: v.approveStocktake,
          })
        : await createUser({
            fullName: v.fullName,
            username: v.username,
            role: v.role,
            warehouseIds: v.role === "thu_kho" ? v.warehouseIds : [],
            tempPassword: v.tempPassword,
            viewKiotVietHistory: v.viewKiotVietHistory,
            approveStocktake: v.approveStocktake,
          });

      if (!kq.ok) {
        if (kq.field) {
          setError(kq.field as keyof UserFormValues, { message: kq.message });
        } else {
          setError("root", { message: kq.message });
        }
        return;
      }

      void queryClient.invalidateQueries({ queryKey: userListKey });

      if (isNew) {
        message.success(`Đã tạo tài khoản ${normalizeUsername(v.username)}`);
      } else {
        const roleChanged = user.vai_tro !== v.role;
        const previousWarehouses = userWarehouses(user).map((k) => k.id);
        const warehousesChanged =
          previousWarehouses.length !== v.warehouseIds.length || previousWarehouses.some((k) => !v.warehouseIds.includes(k));

        if (roleChanged || warehousesChanged) {
          notification.info({
            message: "Đã lưu",
            description:
              "Quyền bị thu hẹp có hiệu lực ngay. Quyền được mở rộng có hiệu lực khi nhân viên tải lại page hoặc trong tối đa 60 phút.",
          });
        } else {
          message.success("Đã lưu tài khoản");
        }
      }

      onClose();
    });
  });

  return (
    <FormDrawer
      open={open}
      title={isNew ? "Thêm tài khoản" : "Sửa tài khoản"}
      saving={dangChay}
      onClose={onClose}
      onSave={() => void onSave()}
    >
      <Form layout="vertical" onFinish={() => void onSave()}>
        {errors.root ? (
          <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
        ) : null}

        <Form.Item
          label="Họ tên"
          validateStatus={errors.fullName ? "error" : undefined}
          help={errors.fullName?.message}
        >
          <Controller
            name="fullName"
            control={control}
            render={({ field }) => <Input {...field} autoFocus />}
          />
        </Form.Item>

        {isNew ? (
          <Form.Item
            label="Tên đăng nhập"
            validateStatus={errors.username ? "error" : undefined}
            help={
              errors.username?.message ?? (
                <span>
                  Nhân viên gõ đúng tên này khi đăng nhập
                  {username ? (
                    <>
                      {" — sẽ lưu thành "}
                      <code>{normalizeUsername(username)}</code>
                    </>
                  ) : null}
                </span>
              )
            }
          >
            <Controller
              name="username"
              control={control}
              render={({ field }) => <Input {...field} />}
            />
          </Form.Item>
        ) : (
          <Form.Item label="Tên đăng nhập">
            <Typography.Text className="font-mono">
              {user.ten_dang_nhap ?? "(chưa đặt)"}
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
          validateStatus={errors.role ? "error" : undefined}
          help={errors.role?.message}
        >
          <Controller
            name="role"
            control={control}
            render={({ field }) => (
              <Radio.Group {...field} className="flex flex-col gap-2">
                {ROLES.map((v) => (
                  <Radio key={v} value={v}>
                    {ROLE_LABELS[v]}
                    <div className="text-xs text-gray-500">{MO_TA_VAI_TRO[v]}</div>
                  </Radio>
                ))}
              </Radio.Group>
            )}
          />
        </Form.Item>

        {role === "thu_kho" ? (
          <Form.Item
            label="Kho được vào"
            validateStatus={errors.warehouseIds ? "error" : undefined}
            help={errors.warehouseIds?.message ?? "Thủ kho chỉ thấy tồn và phiếu của kho được gán."}
          >
            <Controller
              name="warehouseIds"
              control={control}
              render={({ field }) => (
                <Checkbox.Group
                  value={field.value}
                  onChange={field.onChange}
                  options={(warehouses.data ?? []).map((w) => ({ value: w.id, label: w.ten }))}
                />
              )}
            />
          </Form.Item>
        ) : null}

        <UserSpecialPermissions control={control} role={role} />

        {isNew ? (
          <Form.Item
            label="Mật khẩu tạm"
            validateStatus={errors.tempPassword ? "error" : undefined}
            help={
              errors.tempPassword?.message ??
              "Đưa mật khẩu này tận tay nhân viên. Họ phải đổi ở lần đăng nhập đầu."
            }
          >
            <Controller
              name="tempPassword"
              control={control}
              render={({ field }) => (
                <TempPasswordField value={field.value} onChange={field.onChange} />
              )}
            />
          </Form.Item>
        ) : null}
      </Form>
    </FormDrawer>
  );
}
