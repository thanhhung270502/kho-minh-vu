"use client";

import {
  App,
  Button,
  Dropdown,
  Grid,
  Input,
  Modal,
  Popover,
  Select,
  Space,
} from "antd";
import { useState, type ReactNode } from "react";

import { explainError } from "@/shared/lib/errors";

import type {
  NoteDecision,
  NoteDecisionKind,
  NoteRow,
} from "../api/note-review.api";
import { useCustomerSearch, useDecideNote } from "../hooks/useNoteReview";
import { extractPhoneNumber, suggestCustomerName, truncate } from "../lib/notes";

type Props = { row: NoteRow };

/** Lựa chọn chỉ có ở giao diện, không gửi xuống RPC. */
type MergeAction = "MERGE";
type PanelKey = NoteDecisionKind | MergeAction;

/** Một ô chọn khách có sẵn, tìm server-side theo từ khóa đang gõ. */
function CustomerSelect({
  value,
  onChange,
}: {
  value: string | undefined;
  onChange: (id: string | undefined) => void;
}) {
  const [query, setQuery] = useState("");
  const customers = useCustomerSearch(query);

  return (
    <Select
      showSearch
      allowClear
      className="w-full"
      placeholder="Gõ tên khách để tìm"
      value={value}
      filterOption={false}
      loading={customers.isFetching}
      onSearch={setQuery}
      onChange={(selected) => onChange(selected ?? undefined)}
      options={(customers.data ?? []).map((customer) => ({
        value: customer.id,
        label: `${customer.code} — ${customer.name}`,
      }))}
      notFoundContent={
        customers.isFetching ? "Đang tìm…" : "Không thấy khách nào khớp"
      }
    />
  );
}

export function NoteActions({ row }: Props) {
  const { message } = App.useApp();
  const decide = useDecideNote();
  const screens = Grid.useBreakpoint();

  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null);
  const [customerName, setCustomerName] = useState(() =>
    suggestCustomerName(row.value),
  );
  const [phone, setPhone] = useState(() => extractPhoneNumber(row.value) ?? "");
  const [salesName, setSalesName] = useState(() => suggestCustomerName(row.value));
  const [customerId, setCustomerId] = useState<string | undefined>(undefined);

  async function save(decision: Omit<NoteDecision, "value">) {
    try {
      await decide.mutateAsync({ ...decision, value: row.value });
      message.success(`Đã lưu: ${truncate(row.value)}`);
      setOpenPanel(null);
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  const saving = decide.isPending;

  const panels: Record<NoteDecisionKind, ReactNode> = {
    KHACH: (
      <div className="flex w-72 flex-col gap-2">
        <Input
          autoFocus
          value={customerName}
          placeholder="Tên khách"
          onChange={(event) => setCustomerName(event.target.value)}
          onPressEnter={() =>
            void save({
              kind: "KHACH",
              newCustomer: { ten: customerName, dien_thoai: phone || null },
            })
          }
        />
        <Input
          value={phone}
          placeholder="Điện thoại (không bắt buộc)"
          onChange={(event) => setPhone(event.target.value)}
        />
        <Button
          type="primary"
          loading={saving}
          disabled={!customerName.trim()}
          onClick={() =>
            void save({
              kind: "KHACH",
              newCustomer: { ten: customerName, dien_thoai: phone || null },
            })
          }
        >
          Tạo khách
        </Button>
      </div>
    ),
    SALE: (
      <div className="flex w-72 flex-col gap-2">
        <Input
          autoFocus
          value={salesName}
          placeholder="Tên người bán"
          onChange={(event) => setSalesName(event.target.value)}
          onPressEnter={() => void save({ kind: "SALE", salesName })}
        />
        <Button
          type="primary"
          loading={saving}
          disabled={!salesName.trim()}
          onClick={() => void save({ kind: "SALE", salesName })}
        >
          Lưu là sale
        </Button>
      </div>
    ),
    KHACH_VA_SALE: (
      <div className="flex w-80 flex-col gap-2">
        <span className="text-xs text-gray-500">
          Vừa là khách vừa là người bán — chọn khách có sẵn hoặc để trống để tạo
          mới theo tên bên dưới.
        </span>
        <CustomerSelect value={customerId} onChange={setCustomerId} />
        <Input
          value={customerName}
          placeholder="Tên khách (nếu tạo mới)"
          onChange={(event) => setCustomerName(event.target.value)}
        />
        <Input
          value={salesName}
          placeholder="Tên người bán"
          onChange={(event) => setSalesName(event.target.value)}
        />
        <Button
          type="primary"
          loading={saving}
          disabled={!salesName.trim() || (!customerId && !customerName.trim())}
          onClick={() =>
            void save({
              kind: "KHACH_VA_SALE",
              partnerId: customerId,
              newCustomer: customerId
                ? undefined
                : { ten: customerName, dien_thoai: phone || null },
              salesName,
            })
          }
        >
          Lưu
        </Button>
      </div>
    ),
    BO_QUA: null,
  };

  const actions: Array<{ kind: NoteDecisionKind; label: string }> = [
    { kind: "KHACH", label: "Tạo khách" },
    { kind: "SALE", label: "Là sale" },
    { kind: "KHACH_VA_SALE", label: "Khách + sale" },
  ];

  // "Gộp vào khách" tách riêng vì nội dung popover chỉ có ô chọn.
  const mergePanel = (
    <div className="flex w-72 flex-col gap-2">
      <CustomerSelect value={customerId} onChange={setCustomerId} />
      <Button
        type="primary"
        loading={saving}
        disabled={!customerId}
        onClick={() => void save({ kind: "KHACH", partnerId: customerId })}
      >
        Gộp vào khách này
      </Button>
    </div>
  );

  const PANEL_TITLES: Record<PanelKey, string> = {
    KHACH: "Tạo khách",
    SALE: "Là sale",
    KHACH_VA_SALE: "Khách + sale",
    MERGE: "Gộp vào khách có sẵn",
    BO_QUA: "Bỏ qua",
  };

  if (!screens.md) {
    // Trên điện thoại không đủ chỗ cho 5 nút — gom vào menu, nội dung form mở
    // trong Modal (Popover neo theo nút sẽ tràn màn hình).
    return (
      <>
        <Modal
          open={openPanel !== null && openPanel !== "BO_QUA"}
          title={openPanel ? PANEL_TITLES[openPanel] : ""}
          footer={null}
          onCancel={() => setOpenPanel(null)}
        >
          {openPanel === "MERGE"
            ? mergePanel
            : openPanel
              ? panels[openPanel]
              : null}
        </Modal>

        <Dropdown
          trigger={["click"]}
          menu={{
            items: [
              ...actions.map((action) => ({
                key: action.kind,
                label: action.label,
              })),
              { key: "MERGE", label: "Gộp vào khách có sẵn" },
              { type: "divider" as const },
              { key: "BO_QUA", label: "Bỏ qua" },
            ],
            onClick: ({ key }) => {
              if (key === "BO_QUA") {
                void save({ kind: "BO_QUA" });
                return;
              }
              setOpenPanel(key as PanelKey);
            },
          }}
        >
          <Button size="small">Quyết định…</Button>
        </Dropdown>
      </>
    );
  }

  return (
    <Space size={4} wrap>
      {actions.map((action) => (
        <Popover
          key={action.kind}
          open={openPanel === action.kind}
          trigger="click"
          placement="bottomRight"
          content={panels[action.kind]}
          onOpenChange={(visible) => setOpenPanel(visible ? action.kind : null)}
        >
          <Button size="small" disabled={saving && openPanel !== action.kind}>
            {action.label}
          </Button>
        </Popover>
      ))}

      <Popover
        open={openPanel === "MERGE"}
        trigger="click"
        placement="bottomRight"
        content={mergePanel}
        onOpenChange={(visible) => setOpenPanel(visible ? "MERGE" : null)}
      >
        <Button size="small" disabled={saving}>
          Gộp
        </Button>
      </Popover>

      <Button
        size="small"
        loading={saving}
        onClick={() => void save({ kind: "BO_QUA" })}
      >
        Bỏ qua
      </Button>
    </Space>
  );
}
