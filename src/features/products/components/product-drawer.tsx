"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Checkbox, Form, Skeleton } from "antd";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { explainError, isPostgrestError } from "@/shared/lib/errors";

import { useLookups, useProductDetail, useSaveProduct } from "../hooks/useProducts";
import { productSchema, type ProductFormValues } from "../schemas/product.schema";
import type { Lookups, ProductInput } from "../types";
import { copyProductDefaults, toProductFormValues } from "../lib/product-expanded";
import { ProductFormFields } from "./product-form-fields";

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
  description: null,
  isActive: true,
  kind: "HANG_HOA",
  directSale: true,
  shelfLocation: null,
  brandCode: null,
  modelCode: null,
  partCode: null,
  sharedVehicles: [],
  manualFields: [],
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
    setValue,
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
      description: values.description,
      isActive: values.isActive,
      kind: values.kind,
      directSale: values.directSale,
      shelfLocation: values.shelfLocation,
      brandCode: values.brandCode,
      modelCode: values.modelCode,
      partCode: values.partCode,
      sharedVehicles: values.sharedVehicles,
      manualFields: values.manualFields,
    };

    try {
      await save.mutateAsync({ id: id ?? undefined, values: input });
      message.success(
        isNew ? `Đã tạo mã ${values.code}` : `Đã lưu mã ${values.code}`,
      );

      if (isNew && createAnother) {
        // Giữ nhóm / loại / ĐVT / xử lý / kho để nhập loạt mã cùng loại cho nhanh.
        const kept = getValues();
        reset({
          ...EMPTY_FORM,
          categoryId: kept.categoryId,
          kind: kept.kind,
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

          <ProductFormFields
            control={control}
            errors={errors}
            setValue={setValue}
            getValues={getValues}
            lookups={data}
            isNew={isNew}
            note={product?.note ?? null}
          />
        </Form>
      )}
    </FormDrawer>
  );
}
