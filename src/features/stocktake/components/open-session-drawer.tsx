"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Form, Input, Select } from "antd";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";

import { FormDrawer } from "@/shared/components/form-drawer";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";
import { filterByLabel } from "@/shared/lib/text";

import { useOpenSession, useStocktakeLookups } from "../hooks/useStocktake";
import { openSessionSchema, type OpenSessionInput } from "../schemas/stocktake.schema";
import type { PickedProduct } from "./product-scope-picker";
import { SessionScopeFields } from "./session-scope-fields";

type Props = { open: boolean; onClose: () => void; isStorekeeper: boolean };

export function OpenSessionDrawer({ open, onClose, isStorekeeper }: Props) {
  const router = useRouter();
  const lookups = useStocktakeLookups();
  const openSession = useOpenSession();

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    formState: { errors, isSubmitted },
  } = useForm<OpenSessionInput>({
    resolver: zodResolver(openSessionSchema),
    defaultValues: { warehouseId: "", scope: "category", categoryIds: [], productIds: [], note: "" },
  });
  const warehouseId = useWatch({ control, name: "warehouseId" });
  // Form chỉ giữ mảng id; mã + tên để hiện danh sách giữ ở đây (0129).
  const [picked, setPicked] = useState<PickedProduct[]>([]);

  function changePicked(next: PickedProduct[]) {
    setPicked(next);
    setValue(
      "productIds",
      next.map((p) => p.id),
      { shouldValidate: isSubmitted },
    );
  }

  const allWarehouses = lookups.data?.warehouses ?? [];
  const assignedIds = lookups.data?.assignedWarehouseIds ?? [];
  // Thủ kho chỉ thấy kho được phân của chính mình — quản lý/văn phòng thấy hết.
  const warehouses = isStorekeeper
    ? allWarehouses.filter((w) => assignedIds.includes(w.id))
    : allWarehouses;

  useEffect(() => {
    if (!open) return;
    reset({
      // Đúng một kho thì chọn sẵn, đỡ một bước bấm.
      warehouseId: warehouses.length === 1 ? (warehouses[0]?.id ?? "") : "",
      scope: "category",
      categoryIds: [],
      productIds: [],
      note: "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, lookups.data]);

  function close() {
    if (openSession.isPending) return;
    setPicked([]);
    onClose();
  }

  const onSave = handleSubmit(async (values) => {
    try {
      const id = await openSession.mutateAsync(values);
      setPicked([]);
      onClose();
      router.push(`/kiem-ke/${id}`);
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("root", {
          message: "Bạn không được mở phiên cho kho này — liên hệ quản lý.",
        });
        return;
      }

      if (errorCode(caught) === "23514") {
        const raw = isPostgrestError(caught) ? caught.message : "";
        if (raw.toLowerCase().includes("kho")) {
          setError("warehouseId", { message: raw });
        } else {
          const explained = explainError(caught);
          setError("root", { message: raw || explained.title });
        }
        return;
      }

      const explained = explainError(caught);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  return (
    <FormDrawer
      open={open}
      title="Mở phiên kiểm kê"
      saving={openSession.isPending}
      onClose={close}
      onSave={() => void onSave()}
      saveLabel="Mở phiên"
    >
      <Form layout="vertical" onFinish={() => void onSave()}>
        {errors.root ? (
          <Alert className="mb-4" type="error" showIcon title={errors.root.message} />
        ) : null}

        <Alert
          className="mb-4"
          type="info"
          showIcon
          title="Kho KHÔNG cần đóng khi kiểm kê — phiếu nhập/xuất vẫn hoàn thành bình thường. Tồn sổ của mỗi mã được chốt đúng lúc lưu số kiểm mã đó, nên kiểm xong mã nào nhập ngay mã đó."
        />

        <Form.Item
          label="Kho"
          validateStatus={errors.warehouseId ? "error" : undefined}
          help={errors.warehouseId?.message}
        >
          <Controller
            name="warehouseId"
            control={control}
            render={({ field }) => (
              <Select
                showSearch
                autoFocus
                placeholder="Chọn kho"
                loading={lookups.isPending}
                value={field.value || undefined}
                onChange={(value) => field.onChange(value ?? "")}
                filterOption={filterByLabel}
                options={warehouses.map((w) => ({ value: w.id, label: w.name }))}
              />
            )}
          />
        </Form.Item>

        <SessionScopeFields
          control={control}
          productIdsError={errors.productIds?.message}
          categories={lookups.data?.categories ?? []}
          categoriesLoading={lookups.isPending}
          warehouseId={warehouseId}
          picked={picked}
          onPickedChange={changePicked}
        />

        <Form.Item label="Ghi chú">
          <Controller
            name="note"
            control={control}
            render={({ field }) => <Input.TextArea {...field} rows={2} />}
          />
        </Form.Item>
      </Form>
    </FormDrawer>
  );
}
