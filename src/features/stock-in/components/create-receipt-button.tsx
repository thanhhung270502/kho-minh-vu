"use client";

import { Alert, App, Form, Modal, Radio, Select } from "antd";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { usePartners } from "@/features/partners/hooks/usePartners";
import { DEFAULT_PARTNER_FILTER } from "@/features/partners/types";
import { useLookups } from "@/features/products/hooks/useProducts";
import { errorCode, explainError } from "@/shared/lib/errors";
import { filterByLabel } from "@/shared/lib/text";

import { useCreateReceipt } from "../hooks/useReceipts";
import { RECEIPT_SOURCE_LABELS, type ReceiptSource } from "../types";

/** Mã NCC của nhà máy Vũ Trụ L.An — chọn nó thì gợi ý nguồn "Nhà máy". */
const FACTORY_PARTNER_CODE = "NCC000001";

export function CreateReceiptButton({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const { message } = App.useApp();
  const router = useRouter();
  const createReceipt = useCreateReceipt();
  const lookups = useLookups();
  const suppliers = usePartners({ ...DEFAULT_PARTNER_FILTER, kind: "NCC" });

  const [partnerId, setPartnerId] = useState<string | undefined>();
  const [warehouseId, setWarehouseId] = useState<string | undefined>();
  const [source, setSource] = useState<ReceiptSource>("NCC");
  const [error, setError] = useState<string | null>(null);

  const warehouses = lookups.data?.warehouses ?? [];
  const selectedWarehouseId =
    warehouseId ?? (warehouses.length === 1 ? warehouses[0]?.id : undefined);

  function close() {
    if (createReceipt.isPending) return;
    setError(null);
    onClose();
  }

  async function create() {
    if (!partnerId || !selectedWarehouseId) {
      setError("Chọn nhà cung cấp và kho trước khi tạo phiếu.");
      return;
    }

    try {
      const id = await createReceipt.mutateAsync({
        partnerId,
        warehouseId: selectedWarehouseId,
        source,
      });
      message.success("Đã tạo phiếu, số phiếu đã được cấp");
      onClose();
      router.push(`/nhap-kho/${id}`);
    } catch (caught) {
      if (errorCode(caught) === "42501") {
        setError("Tài khoản không có quyền tạo phiếu nhập.");
        return;
      }
      const explained = explainError(caught);
      setError(`${explained.title}. ${explained.action}`);
    }
  }

  return (
    <Modal
      open={open}
      title="Tạo phiếu nhập"
      okText="Tạo phiếu"
      cancelText="Hủy"
      confirmLoading={createReceipt.isPending}
      onOk={() => void create()}
      onCancel={close}
    >
      {error ? <Alert className="mb-3" type="error" showIcon title={error} /> : null}

      <Alert
        className="mb-3"
        type="info"
        showIcon
        title="Bấm Tạo là phiếu được cấp số ngay và lưu trên server — nhập dở vẫn còn khi mất điện hay đổi máy."
      />

      <Form layout="vertical">
        <Form.Item label="Nhà cung cấp">
          <Select
            showSearch
            autoFocus
            filterOption={filterByLabel}
            placeholder="Chọn nhà cung cấp"
            loading={suppliers.isPending}
            value={partnerId}
            options={(suppliers.data?.rows ?? []).map((supplier) => ({
              value: supplier.id,
              label: `${supplier.code} — ${supplier.name}`,
            }))}
            onChange={(value) => {
              setPartnerId(value);
              // Gợi ý thôi, không ép: nhà máy cũng có thể gửi hàng mua ngoài.
              const selected = (suppliers.data?.rows ?? []).find(
                (supplier) => supplier.id === value,
              );
              if (selected?.code === FACTORY_PARTNER_CODE) setSource("NHA_MAY");
            }}
          />
        </Form.Item>

        <Form.Item label="Kho mặc định" help="Từng dòng vẫn chọn kho riêng được.">
          <Select
            placeholder="Chọn kho"
            value={selectedWarehouseId}
            options={warehouses.map((warehouse) => ({
              value: warehouse.id,
              label: warehouse.name,
            }))}
            onChange={setWarehouseId}
          />
        </Form.Item>

        <Form.Item
          label="Nguồn nhập"
          help="Quyết định dãy số phiếu — chọn xong không đổi được vì số đã cấp theo nguồn."
        >
          <Radio.Group
            value={source}
            optionType="button"
            buttonStyle="solid"
            onChange={(event) => setSource(event.target.value as ReceiptSource)}
          >
            {(["NCC", "NHA_MAY"] as const).map((option) => (
              <Radio.Button key={option} value={option}>
                {RECEIPT_SOURCE_LABELS[option]}
              </Radio.Button>
            ))}
          </Radio.Group>
        </Form.Item>
      </Form>
    </Modal>
  );
}
