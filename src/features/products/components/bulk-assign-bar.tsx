"use client";

import { App, Button, Dropdown, Select, Space } from "antd";
import { useState } from "react";

import { explainError } from "@/shared/lib/errors";

import { useBulkAssign, useConfirmReviewed } from "../hooks/useProducts";
import type { EditableProductField, Lookups } from "../types";

const MAX_SELECTION = 1000;

/**
 * Ô "Gán …": sau khi gán xong phải trở lại placeholder chứ không giữ giá trị vừa
 * chọn — nó là một HÀNH ĐỘNG, không phải một ô dữ liệu. Giữ state trong này để
 * thanh công cụ không phải nuôi ba state gần như giống nhau.
 */
function AssignSelect({
  placeholder,
  className,
  options,
  disabled,
  onSelect,
}: {
  placeholder: string;
  className: string;
  options: Array<{ value: string; label: string }>;
  disabled: boolean;
  onSelect: (id: string, name: string) => void;
}) {
  const [value, setValue] = useState<string | undefined>(undefined);

  return (
    <Select
      showSearch
      optionFilterProp="label"
      className={className}
      placeholder={placeholder}
      value={value}
      disabled={disabled}
      options={options}
      onChange={(selected) => {
        setValue(undefined);
        onSelect(
          selected,
          options.find((option) => option.value === selected)?.label ?? "",
        );
      }}
    />
  );
}

type Props = {
  ids: string[];
  lookups: Lookups | undefined;
  onDone: () => void;
};

export function BulkAssignBar({ ids, lookups, onDone }: Props) {
  const { message, modal } = App.useApp();
  const assign = useBulkAssign();
  const confirm = useConfirmReviewed();
  const [running, setRunning] = useState(false);

  if (ids.length === 0) return null;

  function confirmThenRun(description: string, run: () => Promise<number>) {
    if (ids.length > MAX_SELECTION) {
      message.warning(`Chọn tối đa ${MAX_SELECTION} mã mỗi lần.`);
      return;
    }

    modal.confirm({
      title: `${description} cho ${ids.length} mã?`,
      content:
        ids.length > 20 ? "Thao tác ghi vào nhật ký sửa của từng mã." : undefined,
      okText: "Làm",
      cancelText: "Thôi",
      onOk: async () => {
        setRunning(true);
        try {
          const count = await run();
          message.success(`Đã cập nhật ${count} mã`);
          onDone();
        } catch (error) {
          const explained = explainError(error);
          message.error(`${explained.title}. ${explained.action}`);
        } finally {
          setRunning(false);
        }
      },
    });
  }

  function assignField(
    field: Extract<EditableProductField, "stageId" | "categoryId" | "unitId">,
    id: string,
    name: string,
    fieldLabel: string,
  ) {
    confirmThenRun(`Gán ${fieldLabel} “${name}”`, () =>
      assign.mutateAsync({
        ids,
        change: { [field]: id || null },
        source: "hang_loat",
      }),
    );
  }

  return (
    <div className="sticky top-0 z-10 mb-2 flex flex-wrap items-center gap-2 rounded-md bg-blue-50 px-3 py-2">
      <strong>Đã chọn {ids.length} mã</strong>

      <AssignSelect
        className="w-44"
        placeholder="Gán công đoạn"
        disabled={running}
        options={(lookups?.stages ?? []).map((stage) => ({
          value: stage.id,
          label: stage.name,
        }))}
        onSelect={(id, name) => assignField("stageId", id, name, "công đoạn")}
      />

      <AssignSelect
        className="w-44"
        placeholder="Gán nhóm hàng"
        disabled={running}
        options={(lookups?.categories ?? []).map((category) => ({
          value: category.id,
          label: category.name,
        }))}
        onSelect={(id, name) => assignField("categoryId", id, name, "nhóm hàng")}
      />

      <AssignSelect
        className="w-36"
        placeholder="Gán ĐVT"
        disabled={running}
        options={(lookups?.units ?? []).map((unit) => ({
          value: unit.id,
          label: unit.name,
        }))}
        onSelect={(id, name) => assignField("unitId", id, name, "đơn vị tính")}
      />

      <Dropdown
        trigger={["click"]}
        disabled={running}
        menu={{
          items: [
            { key: "1", label: "Đang kinh doanh" },
            { key: "0", label: "Ngừng kinh doanh" },
          ],
          onClick: ({ key }) =>
            confirmThenRun(
              key === "1" ? "Đặt lại Đang kinh doanh" : "Đặt Ngừng kinh doanh",
              () =>
                assign.mutateAsync({
                  ids,
                  change: { isActive: key === "1" },
                  source: "hang_loat",
                }),
            ),
        }}
      >
        <Button>Trạng thái</Button>
      </Dropdown>

      <Space className="ms-auto">
        <Button
          disabled={running}
          onClick={() =>
            confirmThenRun("Xác nhận đã rà", () => confirm.mutateAsync(ids))
          }
        >
          Xác nhận đã rà
        </Button>
        <Button type="text" onClick={onDone}>
          Bỏ chọn
        </Button>
      </Space>
    </div>
  );
}
