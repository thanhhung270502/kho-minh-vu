"use client";

import { Checkbox, Form } from "antd";
import { Controller, type Control } from "react-hook-form";

import { BUSINESS_PERMISSIONS, type BusinessPermission, type Role } from "@/shared/lib/permissions";

type Values = { permissions: BusinessPermission[] };

/**
 * 9 quyền tích theo từng người (0117). Quản lý/Admin luôn đủ — hiện tích sẵn và khóa.
 * Không có quyền Phân quyền thì chỉ xem được. Chặn thật ở dat_quyen_nguoi_dung.
 */
export function UserPermissionsField<T extends Values>({
  control,
  role,
  canAssign,
}: {
  control: Control<T>;
  role: Role;
  canAssign: boolean;
}) {
  const isAdmin = role === "quan_ly";
  const help = isAdmin
    ? "Quản lý/Admin luôn có đủ mọi quyền, kể cả kiểm kho, nhân viên phụ trách và hủy chứng từ đã ghi sổ."
    : canAssign
      ? "Bật/tắt có hiệu lực ở lần tải trang kế tiếp của người đó."
      : "Cần quyền Phân quyền để thay đổi.";

  return (
    <Form.Item label="Quyền" help={help}>
      <Controller
        name={"permissions" as never}
        control={control as unknown as Control<Values>}
        render={({ field }) => {
          const value = (field.value ?? []) as BusinessPermission[];
          return (
            <div className="grid grid-cols-1 gap-x-4 gap-y-2 sm:grid-cols-2">
              {BUSINESS_PERMISSIONS.map((p) => (
                <Checkbox
                  key={p.key}
                  checked={isAdmin || value.includes(p.key)}
                  disabled={isAdmin || !canAssign}
                  onChange={(e) =>
                    field.onChange(e.target.checked ? [...value, p.key] : value.filter((k) => k !== p.key))
                  }
                >
                  {p.label}
                  {p.hint ? <div className="text-xs text-chu-phu">{p.hint}</div> : null}
                </Checkbox>
              ))}
            </div>
          );
        }}
      />
    </Form.Item>
  );
}
