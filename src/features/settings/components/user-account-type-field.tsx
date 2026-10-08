"use client";

import { Form, Radio } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useWatch, type Control, type FieldErrors, type UseFormSetValue } from "react-hook-form";

import type { Role } from "@/shared/lib/permissions";

import { accountTypeKeys, fetchAccountTypes, type AccountTypeCode } from "../api/account-type.api";

type Values = { jobTitleId: string; role: Role };

type Props<T extends Values> = {
  control: Control<T>;
  errors: FieldErrors<T>;
  setValue: UseFormSetValue<T>;
  /** Chỉ Admin được chọn loại Quản lý/Admin (chặn leo quyền — 0117). */
  allowAdmin: boolean;
  disabled: boolean;
};

type Kind = "admin" | "staff";
type Reach = "all" | "assigned";

/**
 * Loại tài khoản (0117): Quản lý/Admin — đủ mọi quyền; hoặc Nhân viên — quyền tích
 * theo người, phạm vi kho "mọi kho" hay "chỉ kho được giao". Ghi `jobTitleId` (dòng
 * chuc_vu tương ứng) và `role` (để form biết hiện ô kho). Server đọc lại phạm vi.
 */
export function UserAccountTypeField<T extends Values>({ control, errors, setValue, allowAdmin, disabled }: Props<T>) {
  const types = useQuery({ queryKey: accountTypeKeys.all, queryFn: fetchAccountTypes });
  // Generic react-hook-form: ép về form tối thiểu chỉ ở đây, nơi duy nhất cần.
  const narrowControl = control as unknown as Control<Values>;
  const narrowSetValue = setValue as unknown as UseFormSetValue<Values>;
  const error = (errors as FieldErrors<Values>).jobTitleId;
  const role = useWatch({ control: narrowControl, name: "role" });

  const kind: Kind = role === "quan_ly" ? "admin" : "staff";
  const reach: Reach = role === "thu_kho" ? "assigned" : "all";

  function choose(code: AccountTypeCode) {
    const type = types.data?.find((t) => t.code === code);
    if (!type) return;
    narrowSetValue("jobTitleId", type.id, { shouldValidate: true, shouldDirty: true });
    narrowSetValue("role", type.scope, { shouldValidate: false });
  }

  return (
    <>
      <Form.Item
        label="Loại tài khoản"
        validateStatus={error ? "error" : undefined}
        help={
          error?.message ??
          (types.isError ? "Không tải được loại tài khoản. Đóng rồi mở lại form." : undefined)
        }
      >
        <Radio.Group
          value={role === "chi_xem" ? undefined : kind}
          disabled={disabled || types.isPending}
          optionType="button"
          buttonStyle="solid"
          onChange={(e) => choose(e.target.value === "admin" ? "QUAN_LY" : reach === "assigned" ? "THU_KHO" : "NHAN_VIEN")}
          options={[
            { value: "staff", label: "Nhân viên" },
            { value: "admin", label: "Quản lý/Admin", disabled: !allowAdmin },
          ]}
        />
      </Form.Item>
      {kind === "staff" && role !== "chi_xem" ? (
        <Form.Item label="Phạm vi kho">
          <Radio.Group
            value={reach}
            disabled={disabled || types.isPending}
            onChange={(e) => choose(e.target.value === "assigned" ? "THU_KHO" : "NHAN_VIEN")}
            options={[
              { value: "all", label: "Mọi kho" },
              { value: "assigned", label: "Chỉ kho được giao" },
            ]}
          />
        </Form.Item>
      ) : null}
    </>
  );
}
