"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Checkbox, Form, Input, Typography } from "antd";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useTransition } from "react";
import { Controller, useForm, useWatch, type Resolver } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { normalizeUsername } from "@/shared/lib/text";
import type { BusinessPermission, Role } from "@/shared/lib/permissions";

import { updateUser, createUser } from "../actions/user.actions";
import {
  activeWarehouseKey,
  userListKey,
  userWarehouses,
  fetchActiveWarehouses,
  type UserRow,
} from "../api/user.api";
import { editUserFormSchema, createUserFormSchema } from "../schemas/user.schema";
import { TempPasswordField, generateTempPassword } from "./temp-password-field";
import { UserAccountTypeField } from "./user-account-type-field";
import { UserPermissionsField } from "./user-permissions-field";

type UserFormValues = {
  fullName: string;
  username: string;
  jobTitleId: string;
  /** Phạm vi của loại tài khoản đang chọn — UserAccountTypeField tự điền. */
  role: Role;
  warehouseIds: string[];
  tempPassword: string;
  approveStocktake: boolean;
  permissions: BusinessPermission[];
};

/** Quyền của NGƯỜI ĐANG ĐĂNG NHẬP với màn tài khoản (0117). */
export type AccountAccess = { isAdmin: boolean; canProfile: boolean; canAssign: boolean };

type Props = { open: boolean; user: UserRow | null; onClose: () => void; access: AccountAccess };

export function UserDrawer({ open, user, onClose, access }: Props) {
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
    setValue,
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
      jobTitleId: "",
      role: "chi_xem",
      warehouseIds: [],
      tempPassword: "",
      approveStocktake: false,
      permissions: [],
    },
  });

  useEffect(() => {
    if (!open) return;

    reset(
      user
        ? {
            fullName: user.ho_ten,
            username: user.ten_dang_nhap ?? "",
            jobTitleId: user.chuc_vu_id,
            role: user.vai_tro,
            warehouseIds: userWarehouses(user).map((k) => k.id),
            tempPassword: "",
            approveStocktake: user.duyet_kiem_ke,
            permissions: user.permissions,
          }
        : {
            fullName: "",
            username: "",
            jobTitleId: "",
            role: "chi_xem",
            warehouseIds: [],
            tempPassword: generateTempPassword(),
            approveStocktake: false,
            permissions: [],
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
            jobTitleId: v.jobTitleId,
            role: v.role,
            warehouseIds: v.role === "thu_kho" ? v.warehouseIds : [],
            approveStocktake: v.approveStocktake,
            permissions: v.permissions,
          })
        : await createUser({
            fullName: v.fullName,
            username: v.username,
            jobTitleId: v.jobTitleId,
            role: v.role,
            warehouseIds: v.role === "thu_kho" ? v.warehouseIds : [],
            tempPassword: v.tempPassword,
            approveStocktake: v.approveStocktake,
            permissions: v.permissions,
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
        // Chỉ đổi quyền thì có hiệu lực ngay (co_quyen đọc bảng); đổi loại / kho thì cần token mới.
        const roleChanged = user.vai_tro !== v.role;
        const previousWarehouses = userWarehouses(user).map((k) => k.id);
        const warehousesChanged =
          previousWarehouses.length !== v.warehouseIds.length || previousWarehouses.some((k) => !v.warehouseIds.includes(k));

        if (roleChanged || warehousesChanged) {
          notification.info({
            title: "Đã lưu",
            description:
              "Quyền bị thu hẹp có hiệu lực ngay. Quyền được mở rộng có hiệu lực khi nhân viên tải lại trang hoặc trong tối đa 60 phút.",
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
            render={({ field }) => <Input {...field} autoFocus disabled={!access.canProfile} />}
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

        <UserAccountTypeField
          control={control}
          errors={errors}
          setValue={setValue}
          // Chỉ Admin cấp được loại Admin; tài khoản đang là Admin thì chỉ Admin mở được form này.
          allowAdmin={access.isAdmin}
          disabled={!access.canProfile}
        />

        {role === "thu_kho" ? (
          <Form.Item
            label="Kho được vào"
            validateStatus={errors.warehouseIds ? "error" : undefined}
            help={errors.warehouseIds?.message ?? "Chỉ thấy tồn và phiếu của kho được gán."}
          >
            <Controller
              name="warehouseIds"
              control={control}
              render={({ field }) => (
                <Checkbox.Group
                  disabled={!access.canProfile}
                  value={field.value}
                  onChange={field.onChange}
                  options={(warehouses.data ?? []).map((w) => ({ value: w.id, label: w.ten }))}
                />
              )}
            />
          </Form.Item>
        ) : null}

        <UserPermissionsField control={control} role={role} canAssign={access.canAssign} />

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
