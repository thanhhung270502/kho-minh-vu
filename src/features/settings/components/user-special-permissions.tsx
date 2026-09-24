"use client";

import { Checkbox, Form, Typography } from "antd";
import { Controller, type Control } from "react-hook-form";

import type { Role } from "@/shared/lib/permissions";

type FieldValues = {
  viewKiotVietHistory: boolean;
  approveStocktake: boolean;
};

/**
 * Hai công tắc quyền THEO NGƯỜI (D-13/D-14) — không thuộc PERMISSION_MATRIX.
 * Quản lý luôn tick + khóa (D-15). Tách riêng khỏi UserDrawer để giữ file dưới ~200 dòng.
 */
export function UserSpecialPermissions<T extends FieldValues>({
  control,
  role,
}: {
  control: Control<T>;
  role: Role;
}) {
  const locked = role === "quan_ly";

  return (
    <Form.Item label="Quyền riêng">
      <div className="flex flex-col gap-2">
        <Controller
          name={"viewKiotVietHistory" as never}
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={locked ? true : (field.value as boolean)}
              disabled={locked}
              onChange={(e) => field.onChange(e.target.checked)}
            >
              Xem lịch sử KiotViet
              <div className="text-xs text-gray-500">
                Tra 594 phiếu nhập và 4.732 hóa đơn cũ
                {locked ? " — Quản lý luôn có quyền này" : null}
              </div>
            </Checkbox>
          )}
        />
        <Controller
          name={"approveStocktake" as never}
          control={control}
          render={({ field }) => (
            <Checkbox
              checked={locked ? true : (field.value as boolean)}
              disabled={locked}
              onChange={(e) => field.onChange(e.target.checked)}
            >
              Duyệt kiểm kê
              <div className="text-xs text-gray-500">
                Bấm duyệt phiên kiểm kê — sinh phiếu điều chỉnh tồn
                {locked ? " — Quản lý luôn có quyền này" : null}
              </div>
            </Checkbox>
          )}
        />
        <Typography.Text type="secondary" className="text-xs">
          Bật/tắt có hiệu lực ở lần tải trang kế tiếp của người đó, không cần đăng nhập
          lại.
        </Typography.Text>
      </div>
    </Form.Item>
  );
}
