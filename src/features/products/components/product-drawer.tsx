"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, App, Checkbox, Form, Skeleton } from "antd";
import { useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";

import { useLookups, useProductDetail, useSaveProduct } from "../hooks/useProducts";
import { productSchema, type ProductFormValues } from "../schemas/product.schema";
import { copyProductDefaults, toProductFormValues } from "../lib/product-expanded";
import {
  EMPTY_PRODUCT_FORM,
  defaultsForNewProduct,
  nextProductDefaults,
  productSaveError,
  toProductInput,
} from "../lib/product-form";
import { ProductFormFields } from "./product-form-fields";

type Props = {
  id: string | null;
  open: boolean;
  onClose: () => void;
  /** Thêm mã mới điền sẵn từ mã này (nút "Sao chép" ở chi tiết dòng). Chỉ dùng khi `id` null. */
  copyFromId?: string | null;
};

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
    defaultValues: EMPTY_PRODUCT_FORM,
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
    try {
      await save.mutateAsync({ id: id ?? undefined, values: toProductInput(values) });
      message.success(isNew ? `Đã tạo mã ${values.code}` : `Đã lưu mã ${values.code}`);

      if (isNew && createAnother) {
        reset(nextProductDefaults(getValues()));
        setFocus("code");
        return;
      }
      onClose();
    } catch (error) {
      const failure = productSaveError(error);
      setError(failure.field, { message: failure.message });
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
