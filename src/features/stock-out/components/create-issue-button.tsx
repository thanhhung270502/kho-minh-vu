"use client";

import { Alert, Button, DatePicker, Form, Modal, Select, Typography } from "antd";
import dayjs from "dayjs";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { PartnerSearchInput } from "@/shared/components/partner-search-input";
import { useLookups } from "@/features/products/hooks/useProducts";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useCreateIssue } from "../hooks/useIssues";

type Props = {
  /** Nhãn nút — trạng thái rỗng dùng câu khác toolbar để rõ đây là bước tiếp theo. */
  label?: string;
};

export function CreateIssueButton({ label = "Tạo phiếu xuất" }: Props) {
  const router = useRouter();
  const createIssue = useCreateIssue();
  const lookups = useLookups();

  const [open, setOpen] = useState(false);
  const [partnerId, setPartnerId] = useState<string | undefined>();
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [docDate, setDocDate] = useState<string | null>(null);
  const [partnerError, setPartnerError] = useState<string | null>(null);
  const [warehouseError, setWarehouseError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function reset() {
    setPartnerId(undefined);
    setWarehouseId(undefined);
    setDocDate(null);
    setPartnerError(null);
    setWarehouseError(null);
    setError(null);
  }

  function close() {
    if (createIssue.isPending) return;
    setOpen(false);
    reset();
  }

  async function create() {
    let hasError = false;
    if (!partnerId) {
      setPartnerError("Chọn người nhận trước khi tạo phiếu");
      hasError = true;
    }
    if (!warehouseId) {
      setWarehouseError("Chọn kho trước khi tạo phiếu");
      hasError = true;
    }
    if (hasError || !partnerId || !warehouseId) return;

    setPartnerError(null);
    setWarehouseError(null);
    setError(null);

    try {
      const id = await createIssue.mutateAsync({
        partnerId,
        warehouseId,
        ...(docDate ? { docDate } : {}),
      });
      setOpen(false);
      reset();
      // Tạo phiếu là sinh ngay một phiếu có số trên server — không giữ phiếu
      // nháp ở client, giống khuôn createReceipt của Phase 3.
      router.push(`/xuat-kho/${id}`);
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("Tài khoản không có quyền tạo phiếu xuất.");
        return;
      }
      // RPC/ràng buộc database đã soạn sẵn câu tiếng Việt — hiện nguyên văn.
      if (isPostgrestError(caught) && caught.code === "23514") {
        setError(caught.message);
        return;
      }
      const explained = explainError(caught);
      setError(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <>
      <Button type="primary" onClick={() => setOpen(true)}>
        {label}
      </Button>

      <Modal
        open={open}
        title="Tạo phiếu xuất"
        okText="Tạo phiếu"
        cancelText="Hủy"
        confirmLoading={createIssue.isPending}
        mask={{ closable: false }}
        onOk={() => void create()}
        onCancel={close}
      >
        {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

        <Alert
          className="mb-3"
          type="info"
          showIcon
          title="Bấm Tạo là phiếu được cấp số ngay trên server — thêm dòng và ghi sổ ở trang chi tiết."
        />

        <Form layout="vertical">
          <Form.Item
            label="Người nhận"
            validateStatus={partnerError ? "error" : undefined}
            help={partnerError}
          >
            <PartnerSearchInput
              autoFocus
              value={partnerId}
              onChange={(id) => {
                setPartnerId(id);
                setPartnerError(null);
              }}
            />
          </Form.Item>

          <Form.Item
            label="Kho xuất"
            validateStatus={warehouseError ? "error" : undefined}
            help={warehouseError ?? "Kho từng dòng sửa được sau khi mở phiếu."}
          >
            <Select
              placeholder="Chọn kho"
              value={warehouseId}
              options={(lookups.data?.warehouses ?? []).map((warehouse) => ({
                value: warehouse.id,
                label: warehouse.name,
              }))}
              onChange={(value) => {
                setWarehouseId(value);
                setWarehouseError(null);
              }}
            />
          </Form.Item>

          <Form.Item label="Ngày phiếu">
            <DatePicker
              className="w-full"
              format="DD/MM/YYYY"
              value={docDate ? dayjs(docDate) : dayjs()}
              onChange={(date) => setDocDate(date ? date.format("YYYY-MM-DD") : null)}
            />
          </Form.Item>
        </Form>

        <Typography.Text type="secondary" className="block">
          Đây là đường tạo phiếu không qua đơn — dùng cho xuất kho lẻ, xuất nội bộ.
          Xuất theo đơn đã xác nhận thì bấm “Tạo phiếu xuất” ngay trên trang chi tiết đơn.
        </Typography.Text>
      </Modal>
    </>
  );
}
