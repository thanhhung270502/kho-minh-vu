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
import { useEffect, useRef, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { explainError, isPostgrestError } from "@/shared/lib/errors";

import { useLookups, useProductDetail, useSaveProduct } from "../hooks/useProducts";
import { productSchema, type ProductFormValues } from "../schemas/product.schema";
import type { Lookups, ProductInput } from "../types";
import { copyProductDefaults, toProductFormValues } from "../lib/product-expanded";
import { LookupSelect } from "./lookup-select";
import { ProductClassificationFields } from "./product-classification-fields";

type Props = {
  id: string | null;
  open: boolean;
  onClose: () => void;
  /** Thêm mã mới điền sẵn từ mã này (nút "Sao chép" ở chi tiết dòng). Chỉ dùng khi `id` null. */
  copyFromId?: string | null;
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
  barcode: null,
  note: null,
  isActive: true,
  productTypeId: null,
  vehicleLineId: null,
  directSale: true,
  shelfLocation: null,
};

/** Mã mới mặc định ĐVT "CAI" + công đoạn "MUA_NGOAI" — đúng đa số hàng thương mại. */
function defaultsForNewProduct(lookups: Lookups | undefined): ProductFormValues {
  return {
    ...EMPTY_FORM,
    unitId: lookups?.units.find((unit) => unit.code === "CAI")?.id ?? "",
    stageId: lookups?.stages.find((stage) => stage.code === "MUA_NGOAI")?.id ?? "",
  };
}

export function ProductDrawer({ id, open, onClose, copyFromId = null }: Props) {
  const { message } = App.useApp();
  const lookups = useLookups();
  const sourceId = id ?? copyFromId;
  const detail = useProductDetail(sourceId ?? "");
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

  // Nạp giá trị ban đầu MỘT lần mỗi lần mở. Danh mục (lookups.data) tải lại khi
  // người dùng "+ Thêm mới" ĐVT/nhóm/công đoạn ngay trong form — reset theo nó
  // sẽ xóa sạch mọi ô đang gõ dở và bỏ luôn giá trị vừa tạo.
  const initializedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!open) {
      initializedFor.current = null;
      return;
    }
    const key = id ?? (copyFromId ? `copy:${copyFromId}` : "new");
    if (initializedFor.current === key) return;

    if (!id && copyFromId) {
      if (!detail.data) return;
      reset(copyProductDefaults(toProductFormValues(detail.data)));
      initializedFor.current = key;
      setFocus("code");
      return;
    }

    if (!id) {
      // Chờ danh mục về để chọn sẵn ĐVT "CAI" + công đoạn "MUA_NGOAI".
      if (!lookups.data) return;
      reset(defaultsForNewProduct(lookups.data));
      initializedFor.current = key;
      return;
    }

    if (product) {
      initializedFor.current = key;
      reset(toProductFormValues(product));
    }
  }, [open, id, copyFromId, product, detail.data, lookups.data, reset, setFocus]);

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
      barcode: values.barcode,
      note: values.note,
      isActive: values.isActive,
      productTypeId: values.productTypeId,
      vehicleLineId: values.vehicleLineId,
      directSale: values.directSale,
      shelfLocation: values.shelfLocation,
    };

    try {
      await save.mutateAsync({ id: id ?? undefined, values: input });
      message.success(
        isNew ? `Đã tạo mã ${values.code}` : `Đã lưu mã ${values.code}`,
      );

      if (isNew && createAnother) {
        // Giữ nhóm / loại / dòng xe / ĐVT / công đoạn / kho để nhập loạt mã cùng loại cho nhanh.
        const kept = getValues();
        reset({
          ...EMPTY_FORM,
          categoryId: kept.categoryId,
          productTypeId: kept.productTypeId,
          vehicleLineId: kept.vehicleLineId,
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
              "Tài khoản không có quyền sửa danh mục. Nhờ quản lý thao tác giúp.",
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

  return (
    <FormDrawer
      open={open}
      title={
        isNew
          ? copyFromId && detail.data
            ? `Thêm mã hàng — sao chép từ ${detail.data.code}`
            : "Thêm mã hàng"
          : "Sửa mã hàng"
      }
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
      {sourceId && detail.isPending ? (
        <Skeleton active paragraph={{ rows: 10 }} />
      ) : (
        <Form layout="vertical" onFinish={() => void onSave()}>
          {errors.root ? (
            <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
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
                  <LookupSelect
                    table="nhom_hang"
                    label="nhóm hàng"
                    allowClear
                    placeholder="Chưa phân nhóm"
                    value={field.value}
                    onChange={field.onChange}
                    options={(data?.categories ?? []).map((category) => ({
                      value: category.id,
                      label: category.name,
                    }))}
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
                  <LookupSelect
                    table="don_vi_tinh"
                    label="đơn vị tính"
                    value={field.value}
                    onChange={(id) => field.onChange(id ?? "")}
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
                "Hàng qua xử lý gì: sơn, carbon, xi mạ… hoặc hàng ngoài"
              }
            >
              <Controller
                name="stageId"
                control={control}
                render={({ field }) => (
                  <LookupSelect
                    table="cong_doan"
                    label="công đoạn"
                    value={field.value}
                    onChange={(id) => field.onChange(id ?? "")}
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
          </div>

          <ProductClassificationFields control={control} errors={errors} lookups={data} />

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
