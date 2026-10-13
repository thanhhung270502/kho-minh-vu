"use client";

import { Alert, Form, Radio, Select, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { Controller, useWatch, type Control, type FieldErrors } from "react-hook-form";

import { filterByLabel } from "@/shared/lib/text";
import { explainError } from "@/shared/lib/errors";

import { fetchProductGroups, productGroupOptionsKey } from "../api/user.api";

type Values = { productGroupScope: "all" | "some"; productGroupIds: string[] };

/**
 * "Nhóm hàng được phép truy cập" (0132) — giống KiotViet. Người bị giới hạn chỉ thấy mã,
 * tồn và phiếu của các nhóm được chọn. Chặn thật ở RLS và dat_nhom_hang_nguoi_dung.
 */
export function UserProductGroupsField<T extends Values>({
  control,
  errors,
  isAdminTarget,
  isSelf,
  canAssign,
}: {
  control: Control<T>;
  errors: FieldErrors<T>;
  /** Tài khoản đang sửa là Quản lý/Admin — luôn xem mọi nhóm. */
  isAdminTarget: boolean;
  /** Đang sửa chính mình (và không phải Admin) — RPC từ chối tự đổi phạm vi. */
  isSelf: boolean;
  canAssign: boolean;
}) {
  const typedControl = control as unknown as Control<Values>;
  const scope = useWatch({ control: typedControl, name: "productGroupScope" });
  const groups = useQuery({ queryKey: productGroupOptionsKey, queryFn: fetchProductGroups });
  const disabled = isAdminTarget || isSelf || !canAssign;
  const idsError = (errors as FieldErrors<Values>).productGroupIds?.message;

  const help = isAdminTarget
    ? "Quản lý/Admin luôn xem được mọi nhóm hàng."
    : isSelf
      ? "Không tự đổi nhóm hàng của chính mình — nhờ Quản lý/Admin."
      : !canAssign
        ? "Cần quyền Phân quyền để thay đổi."
        : "Áp dụng cho mọi chức năng: hàng hóa, tồn kho, đơn đặt, phiếu nhập. Có hiệu lực ngay khi lưu.";

  return (
    // mt-6: help của mục Quyền ngay trên tràn xuống phần lề dưới, không chừa chỗ cho nhãn.
    <Form.Item className="mt-6" label="Nhóm hàng được phép truy cập" help={help}>
      <Controller
        name="productGroupScope"
        control={typedControl}
        render={({ field }) => (
          <Radio.Group
            className="flex flex-col gap-2"
            disabled={disabled}
            value={isAdminTarget ? "all" : field.value}
            onChange={(e) => field.onChange(e.target.value)}
            options={[
              { value: "all", label: "Tất cả nhóm hàng" },
              { value: "some", label: "Nhóm hàng cụ thể" },
            ]}
          />
        )}
      />

      {!isAdminTarget && scope === "some" ? (
        <Form.Item
          className="mt-2 mb-0"
          validateStatus={idsError ? "error" : undefined}
          help={idsError}
        >
          {groups.isPending ? (
            <Skeleton.Input active block />
          ) : groups.isError ? (
            <Alert
              type="error"
              showIcon
              title="Không tải được danh sách nhóm hàng"
              description={explainError(groups.error).action}
              action={<a onClick={() => void groups.refetch()}>Thử lại</a>}
            />
          ) : (
            <Controller
              name="productGroupIds"
              control={typedControl}
              render={({ field }) => (
                <Select
                  mode="multiple"
                  allowClear
                  showSearch
                  disabled={disabled}
                  placeholder="Chọn nhóm hàng"
                  maxTagCount="responsive"
                  filterOption={filterByLabel}
                  value={field.value}
                  onChange={field.onChange}
                  notFoundContent="Không có nhóm hàng nào khớp"
                  options={groups.data.map((g) => ({ value: g.id, label: g.name }))}
                />
              )}
            />
          )}
        </Form.Item>
      ) : null}
    </Form.Item>
  );
}
