"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import {
  Alert,
  App,
  Checkbox,
  Form,
  Input,
  InputNumber,
  Select,
  Skeleton,
  Switch,
} from "antd";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { explainError, isPostgrestError } from "@/shared/lib/errors";
import { filterByLabel } from "@/shared/lib/text";

import { useLookups, useProductDetail, useSaveProduct } from "../hooks/useProducts";
import { productSchema, type ProductFormValues } from "../schemas/product.schema";
import type { Lookups, ProductInput } from "../types";
import { formatNumber } from "./product-columns";

type Props = {
  id: string | null;
  open: boolean;
  permissions: { canEditSalePrice: boolean; canViewCost: boolean };
  onClose: () => void;
};

const EMPTY_FORM: ProductFormValues = {
  code: "",
  name: "",
  categoryId: null,
  unitId: "",
  stageId: "",
  conversion: 1,
  defaultWarehouseId: null,
  minStock: 0,
  maxStock: null,
  salePrice: 0,
  barcode: null,
  note: null,
  isActive: true,
};

/** Mã mới mặc định ĐVT "CAI" + công đoạn "MUA_NGOAI" — đúng đa số hàng thương mại. */
function defaultsForNewProduct(lookups: Lookups | undefined): ProductFormValues {
  return {
    ...EMPTY_FORM,
    unitId: lookups?.units.find((unit) => unit.code === "CAI")?.id ?? "",
    stageId: lookups?.stages.find((stage) => stage.code === "MUA_NGOAI")?.id ?? "",
  };
}

export function ProductDrawer({ id, open, permissions, onClose }: Props) {
  const { message } = App.useApp();
  const lookups = useLookups();
  const detail = useProductDetail(id ?? "");
  const save = useSaveProduct();
  const [createAnother, setCreateAnother] = useState(false);

  const isNew = !id;
  const product = id && detail.data ? detail.data : null;

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setFocus,
    getValues,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: EMPTY_FORM,
  });

  useEffect(() => {
    if (!open) return;

    if (!id) {
      reset(defaultsForNewProduct(lookups.data));
      return;
    }

    if (product) {
      reset({
        code: product.code,
        name: product.name,
        categoryId: product.categoryId ?? null,
        unitId: product.unitId ?? "",
        stageId: product.stageId ?? "",
        conversion: product.conversion,
        defaultWarehouseId: product.defaultWarehouseId ?? null,
        minStock: product.minStock,
        maxStock: product.maxStock,
        salePrice: product.salePrice,
        barcode: product.barcode ?? null,
        note: product.note ?? null,
        isActive: product.isActive,
      });
    }
  }, [open, id, product, lookups.data, reset]);

  const onSave = handleSubmit(async (values) => {
    const input: ProductInput = {
      code: values.code,
      name: values.name,
      categoryId: values.categoryId,
      unitId: values.unitId,
      stageId: values.stageId,
      conversion: Number(values.conversion),
      defaultWarehouseId: values.defaultWarehouseId,
      minStock: Number(values.minStock),
      maxStock: values.maxStock === null ? null : Number(values.maxStock),
      salePrice: Number(values.salePrice),
      barcode: values.barcode,
      note: values.note,
      isActive: values.isActive,
    };

    try {
      await save.mutateAsync({
        id: id ?? undefined,
        values: input,
        includeSalePrice: permissions.canEditSalePrice,
      });
      message.success(
        isNew ? `Đã tạo mã ${values.code}` : `Đã lưu mã ${values.code}`,
      );

      if (isNew && createAnother) {
        // Giữ nhóm / ĐVT / công đoạn / kho để nhập loạt mã cùng loại cho nhanh.
        const kept = getValues();
        reset({
          ...EMPTY_FORM,
          categoryId: kept.categoryId,
          unitId: kept.unitId,
          stageId: kept.stageId,
          defaultWarehouseId: kept.defaultWarehouseId,
        });
        setFocus("code");
        return;
      }
      onClose();
    } catch (error) {
      if (isPostgrestError(error)) {
        if (error.code === "23505") {
          setError("code", { message: "Mã hàng đã tồn tại. Dùng mã khác." });
          return;
        }
        if (error.code === "42501") {
          setError("root", {
            message:
              "Tài khoản không có quyền sửa danh mục hoặc giá bán. Nhờ quản lý thao tác giúp.",
          });
          return;
        }
        if (error.code === "23514") {
          setError("root", { message: error.message });
          return;
        }
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  const data = lookups.data;
  const needsReview = Boolean(product?.needsReview || product?.unitNeedsReview);

  return (
    <FormDrawer
      open={open}
      title={isNew ? "Thêm mã hàng" : "Sửa mã hàng"}
      saving={save.isPending}
      onClose={onClose}
      onSave={() => void onSave()}
      extra={
        isNew ? (
          <Checkbox
            checked={createAnother}
            onChange={(event) => setCreateAnother(event.target.checked)}
          >
            Tạo tiếp mã khác
          </Checkbox>
        ) : null
      }
    >
      {id && detail.isPending ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <Form layout="vertical" onFinish={() => void onSave()}>
          {errors.root ? (
            <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
          ) : null}

          {needsReview ? (
            <Alert
              className="mb-4"
              type="warning"
              showIcon
              title="Mã này đang trong danh sách Cần rà"
              description="Kiểm tra lại đơn vị tính và công đoạn. Lưu ở đây KHÔNG tự gỡ cờ — gỡ bằng nút “Xác nhận đã rà” ngoài bảng."
            />
          ) : null}

          <div className="grid grid-cols-1 gap-x-4 sm:grid-cols-2">
            <Form.Item
              label="Mã hàng"
              validateStatus={errors.code ? "error" : undefined}
              help={errors.code?.message}
            >
              <Controller
                name="code"
                control={control}
                render={({ field }) => <Input {...field} autoFocus={isNew} />}
              />
            </Form.Item>

            <Form.Item label="Nhóm hàng">
              <Controller
                name="categoryId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    showSearch
                    filterOption={filterByLabel}
                    placeholder="Chưa phân nhóm"
                    options={(data?.categories ?? []).map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
                    onChange={(value) => field.onChange(value ?? null)}
                  />
                )}
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Tên hàng"
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
              label="Đơn vị tính"
              validateStatus={errors.unitId ? "error" : undefined}
              help={errors.unitId?.message ?? "Đếm hàng bằng gì: cái, cặp, bộ…"}
            >
              <Controller
                name="unitId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    showSearch
                    filterOption={filterByLabel}
                    options={(data?.units ?? []).map((unit) => ({
                      value: unit.id,
                      label: unit.name,
                    }))}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Công đoạn"
              validateStatus={errors.stageId ? "error" : undefined}
              help={
                errors.stageId?.message ??
                "Hàng qua xử lý gì: sơn, carbon, xi mạ… hoặc mua ngoài"
              }
            >
              <Controller
                name="stageId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    showSearch
                    filterOption={filterByLabel}
                    options={(data?.stages ?? []).map((stage) => ({
                      value: stage.id,
                      label: stage.name,
                    }))}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Quy đổi"
              validateStatus={errors.conversion ? "error" : undefined}
              help={
                errors.conversion?.message ??
                "Số đơn vị cơ bản trong 1 ĐVT. Để 1 nếu không chắc"
              }
            >
              <Controller
                name="conversion"
                control={control}
                render={({ field }) => (
                  <InputNumber {...field} className="w-full" min={0} step={1} />
                )}
              />
            </Form.Item>

            <Form.Item label="Kho mặc định">
              <Controller
                name="defaultWarehouseId"
                control={control}
                render={({ field }) => (
                  <Select
                    {...field}
                    allowClear
                    placeholder="Không đặt"
                    options={(data?.warehouses ?? []).map((warehouse) => ({
                      value: warehouse.id,
                      label: warehouse.name,
                    }))}
                    onChange={(value) => field.onChange(value ?? null)}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Tồn tối thiểu"
              validateStatus={errors.minStock ? "error" : undefined}
              help={errors.minStock?.message}
            >
              <Controller
                name="minStock"
                control={control}
                render={({ field }) => (
                  <InputNumber {...field} className="w-full" min={0} />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Tồn tối đa"
              validateStatus={errors.maxStock ? "error" : undefined}
              help={errors.maxStock?.message}
            >
              <Controller
                name="maxStock"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    placeholder="Không giới hạn"
                    onChange={(value) => field.onChange(value ?? null)}
                  />
                )}
              />
            </Form.Item>

            <Form.Item
              label="Giá bán"
              validateStatus={errors.salePrice ? "error" : undefined}
              help={
                errors.salePrice?.message ??
                (permissions.canEditSalePrice ? undefined : "Chỉ quản lý đặt giá bán")
              }
            >
              <Controller
                name="salePrice"
                control={control}
                render={({ field }) => (
                  <InputNumber
                    {...field}
                    className="w-full"
                    min={0}
                    disabled={!permissions.canEditSalePrice}
                    formatter={(value) =>
                      value === undefined ? "" : formatNumber(value)
                    }
                    parser={(value) => Number((value ?? "").replace(/\D/g, ""))}
                  />
                )}
              />
            </Form.Item>

            {permissions.canViewCost && product ? (
              <Form.Item
                label="Giá vốn"
                help="Tính tự động từ phiếu nhập, không sửa tay"
              >
                <Input readOnly value={formatNumber(product.costPrice)} />
              </Form.Item>
            ) : null}
          </div>

          <Form.Item label="Barcode">
            <Controller
              name="barcode"
              control={control}
              render={({ field }) => <Input {...field} value={field.value ?? ""} />}
            />
          </Form.Item>

          <Form.Item label="Ghi chú">
            <Controller
              name="note"
              control={control}
              render={({ field }) => (
                <Input.TextArea {...field} value={field.value ?? ""} rows={2} />
              )}
            />
          </Form.Item>

          {!isNew ? (
            <Form.Item
              label="Đang kinh doanh"
              help="Tắt để ẩn mã khỏi danh sách mặc định. Tồn và lịch sử vẫn giữ nguyên."
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
