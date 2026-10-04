import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useWatch, type Control, type UseFormGetValues, type UseFormSetValue } from "react-hook-form";

import { fetchProductNameSheet } from "../api/product-name-sheet.api";
import { productKeys } from "../api/product.keys";
import type { ProductFormValues } from "../schemas/product.schema";

/**
 * Ô "Thêm mã hàng": gõ mã có trong sheet tên hàng chuẩn thì điền sẵn Tên hàng.
 * Chỉ ghi đè khi ô tên đang trống hoặc vẫn là tên tự điền lần trước — tên người
 * dùng đã gõ/sửa thì giữ nguyên. Trả về true khi tên đang hiện là tên tự điền.
 */
export function useAutoFillName({
  control,
  setValue,
  getValues,
  enabled,
}: {
  control: Control<ProductFormValues>;
  setValue: UseFormSetValue<ProductFormValues>;
  getValues: UseFormGetValues<ProductFormValues>;
  enabled: boolean;
}): boolean {
  const sheet = useQuery({
    queryKey: productKeys.nameSheet,
    queryFn: fetchProductNameSheet,
    enabled,
    staleTime: 60 * 60 * 1000,
  });
  const code = useWatch({ control, name: "code" });
  const name = useWatch({ control, name: "name" });
  const lastAuto = useRef<string | null>(null);

  useEffect(() => {
    const names = sheet.data?.names;
    if (!enabled || !names) return;
    const current = getValues("name");
    const untouched = current.trim() === "" || current === lastAuto.current;
    if (!untouched) return;
    const found = names.get((code ?? "").trim().toLowerCase()) ?? "";
    if (found === current) return;
    // Mã đổi sang mã không có trong sheet: xóa tên tự điền cũ, không để tên sai mã.
    lastAuto.current = found === "" ? null : found;
    setValue("name", found, { shouldDirty: true, shouldValidate: found !== "" });
  }, [code, enabled, sheet.data, getValues, setValue]);

  return enabled && name !== "" && name === lastAuto.current;
}
