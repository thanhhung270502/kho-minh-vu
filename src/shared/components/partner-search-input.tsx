"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Alert, Button, Form, Input, Modal, Select } from "antd";
import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";

import { useCustomerSearch } from "@/features/partners/hooks/useNoteReview";
import {
  usePartnerDetail,
  useSavePartner,
  useSuggestedPartnerCode,
} from "@/features/partners/hooks/usePartners";
import {
  partnerSchema,
  type PartnerFormValues,
  type PartnerInput,
} from "@/features/partners/schemas/partner.schema";
import { errorCode, explainError } from "@/shared/lib/errors";

type Props = {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
  disabled?: boolean;
  autoFocus?: boolean;
};

function emptyForm(name: string): PartnerFormValues {
  // `kind`/`isActive` không hiện trên form — mọi đối tác tạo tại chỗ từ ô này
  // đều là khách (D-03), không cho chọn loại.
  return {
    code: "",
    name,
    kind: "KHACH",
    phone: "",
    email: "",
    address: "",
    region: "",
    taxCode: "",
    note: "",
    isActive: true,
  };
}

/**
 * Ô tìm người nhận trên server (D-03). Đặt ở `shared/` vì cả màn đơn
 * (`/dat-hang`) lẫn màn xuất không qua đơn (`/xuat-kho`, plan 04-10) đều cần
 * chọn người nhận — CLAUDE.md cấm feature import trực tiếp nội bộ feature khác.
 *
 * Dữ liệu thật (20/09): `doi_tac` chỉ có 1 khách ("Khách lẻ"). Ô tìm gần như
 * luôn ra rỗng — nhánh "Thêm đối tác mới" mới là đường chính, không phải phụ.
 */
export function PartnerSearchInput({ value, onChange, disabled, autoFocus }: Props) {
  const [query, setQuery] = useState("");
  const customers = useCustomerSearch(query);
  const [createOpen, setCreateOpen] = useState(false);

  const options = (customers.data ?? []).map((customer) => ({
    value: customer.id,
    label: `${customer.code} — ${customer.name}`,
  }));

  // Kết quả tìm chỉ có 20 khách khớp từ khóa hiện tại. Mở một đơn cũ, ô tìm còn
  // trống → người nhận đã chọn thường KHÔNG nằm trong đó (hoặc là NCC, không
  // bao giờ nằm trong đó), và antd hiện nguyên UUID thô. Tự nạp tên của đúng
  // đối tác đang chọn rồi chèn vào danh sách. Đo tận tay ở UAT Phase 4.
  const selectedMissing = Boolean(value) && !options.some((o) => o.value === value);
  const selected = usePartnerDetail(selectedMissing ? (value ?? null) : null);
  if (selectedMissing && value) {
    options.unshift({
      value,
      label: selected.data
        ? `${selected.data.code} — ${selected.data.name}`
        : selected.isPending
          ? "Đang tải…"
          : "(đối tác không còn trong danh sách)",
    });
  }

  return (
    <>
      <Select
        showSearch
        allowClear
        autoFocus={autoFocus}
        disabled={disabled}
        className="w-full"
        placeholder="Gõ tên người nhận để tìm"
        value={value}
        filterOption={false}
        loading={customers.isFetching}
        onSearch={setQuery}
        onChange={(selected) => onChange(selected ?? undefined)}
        options={options}
        // notFoundContent (thay vì dropdownRender): danh sách hiện chưa có mấy
        // ai, nút "Thêm đối tác mới" phải luôn thấy ngay khi không ra kết quả,
        // không chờ người dùng mở rộng dropdown.
        notFoundContent={
          customers.isFetching ? (
            "Đang tìm…"
          ) : (
            <div className="flex flex-col items-start gap-2 px-1 py-1">
              <span className="text-xs text-chu-phu">
                {query.trim()
                  ? `Không thấy người nhận nào tên "${query.trim()}".`
                  : "Danh sách người nhận còn ít — gõ tên rồi tạo mới nếu chưa có."}
              </span>
              <Button
                size="small"
                type="link"
                className="h-auto px-0"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setCreateOpen(true)}
              >
                + Thêm đối tác mới
              </Button>
            </div>
          )
        }
      />

      <CreatePartnerModal
        open={createOpen}
        initialName={query}
        onClose={() => setCreateOpen(false)}
        onCreated={(id) => {
          onChange(id);
          setCreateOpen(false);
        }}
      />
    </>
  );
}

function CreatePartnerModal({
  open,
  initialName,
  onClose,
  onCreated,
}: {
  open: boolean;
  initialName: string;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const save = useSavePartner();
  const suggestedCode = useSuggestedPartnerCode("KHACH", open);

  const {
    control,
    handleSubmit,
    reset,
    setError,
    setValue,
    getFieldState,
    formState: { errors },
  } = useForm<PartnerFormValues, undefined, PartnerInput>({
    resolver: zodResolver(partnerSchema),
    defaultValues: emptyForm(initialName),
  });

  // Mở lại là một lượt tạo mới — nạp lại tên vừa gõ ở ô tìm (CLAUDE.md Bước 5).
  useEffect(() => {
    if (open) reset(emptyForm(initialName));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  // Gợi ý mã theo loại khách, không đè lên mã người dùng đã tự gõ.
  useEffect(() => {
    if (!open || !suggestedCode.data) return;
    if (getFieldState("code").isDirty) return;
    setValue("code", suggestedCode.data);
  }, [open, suggestedCode.data, getFieldState, setValue]);

  function close() {
    if (save.isPending) return;
    onClose();
  }

  const onSubmit = handleSubmit(async (values) => {
    try {
      const id = await save.mutateAsync({ id: null, values });
      onCreated(id);
    } catch (error) {
      if (errorCode(error) === "23505") {
        setError("code", { message: "Mã này đã có, chọn mã khác" });
        return;
      }
      const explained = explainError(error);
      setError("root", { message: `${explained.title}. ${explained.action}` });
    }
  });

  return (
    <Modal
      open={open}
      title="Thêm đối tác mới"
      okText="Tạo đối tác"
      cancelText="Hủy"
      confirmLoading={save.isPending}
      mask={{ closable: false }}
      onOk={() => void onSubmit()}
      onCancel={close}
    >
      {errors.root ? (
        <Alert className="mb-3" type="error" showIcon title={errors.root.message} />
      ) : null}

      <Form layout="vertical" onFinish={() => void onSubmit()}>
        <Form.Item
          label="Mã đối tác"
          validateStatus={errors.code ? "error" : undefined}
          help={errors.code?.message ?? "Gợi ý theo loại khách, sửa được"}
        >
          <Controller
            name="code"
            control={control}
            render={({ field }) => <Input {...field} />}
          />
        </Form.Item>

        <Form.Item
          label="Tên đối tác"
          validateStatus={errors.name ? "error" : undefined}
          help={errors.name?.message}
        >
          <Controller
            name="name"
            control={control}
            render={({ field }) => <Input {...field} autoFocus />}
          />
        </Form.Item>

        <Form.Item
          label="Điện thoại (không bắt buộc)"
          validateStatus={errors.phone ? "error" : undefined}
          help={errors.phone?.message}
        >
          <Controller
            name="phone"
            control={control}
            render={({ field }) => <Input {...field} inputMode="tel" />}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
