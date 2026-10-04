"use client";

import { Select } from "antd";
import { useState } from "react";

import { CreatePartnerModal } from "@/shared/components/partner-search-input";
import { QuickStaffModal } from "@/shared/components/quick-staff-modal";
import type { StaffRef } from "@/shared/lib/recipient";
import { labelMatches } from "@/shared/lib/text";

import { CUSTOMER_PREFIX, useRecipientOptions } from "../hooks/use-recipient-options";
import { RecipientCreateActions } from "./recipient-create-actions";

export type RecipientValue = {
  partnerId: string | undefined;
  staffIds: string[];
};

type Props = RecipientValue & {
  extraStaff?: StaffRef[];
  /** Luôn gửi cả tập: có partnerId = đơn "Đối tác", không có = "Nội bộ". */
  onChange: (next: RecipientValue) => void;
  autoFocus?: boolean;
};

/**
 * Một ô cho mọi người nhận (yêu cầu 04/10/2026): mặc định chỉ có nhân viên phụ
 * trách — đơn chủ yếu giao nội bộ. Khách chỉ hiện khi đã gõ chữ, tối đa một khách;
 * có khách thì đơn là "Đối tác", nhân viên đi kèm thành nhân viên phụ trách.
 * Gõ tên chưa có thì thêm ngay nhân viên hoặc khách — để sau thống kê theo người.
 */
export function RecipientPicker({
  partnerId,
  staffIds,
  extraStaff,
  onChange,
  autoFocus,
}: Props) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<"staff" | "customer" | null>(null);
  const [typedName, setTypedName] = useState("");
  const typed = search.trim();

  const { options, exactStaff, loading } = useRecipientOptions(
    typed,
    partnerId,
    extraStaff,
  );

  const value = [
    ...staffIds,
    ...(partnerId ? [CUSTOMER_PREFIX + partnerId] : []),
  ];

  function handleChange(next: string[]) {
    setSearch("");
    const picked = next.filter((id) => id.startsWith(CUSTOMER_PREFIX));
    // Chọn khách thứ hai thì thay khách cũ — một đơn chỉ một khách.
    onChange({
      partnerId: picked.at(-1)?.slice(CUSTOMER_PREFIX.length),
      staffIds: next.filter((id) => !id.startsWith(CUSTOMER_PREFIX)),
    });
  }

  function openCreate(target: "staff" | "customer") {
    setTypedName(typed);
    setCreating(target);
  }

  return (
    <>
      <Select
        mode="multiple"
        showSearch
        allowClear
        maxTagCount="responsive"
        autoFocus={autoFocus}
        className="w-full"
        placeholder="Gõ tên nhân viên nhận hàng"
        value={value}
        searchValue={search}
        onSearch={setSearch}
        // Bẫy 21: gõ không dấu vẫn phải ra tên có dấu.
        filterOption={(input, option) =>
          labelMatches(input, option?.search ?? "")
        }
        loading={loading}
        onChange={handleChange}
        options={options}
        notFoundContent={
          typed ? (
            <span className="text-xs text-chu-phu">{`Chưa có ai tên "${typed}".`}</span>
          ) : null
        }
        popupRender={(menu) => (
          <>
            {menu}
            {typed && !exactStaff ? (
              <RecipientCreateActions typed={typed} onCreate={openCreate} />
            ) : null}
          </>
        )}
      />

      <QuickStaffModal
        open={creating === "staff"}
        initialName={typedName}
        onClose={() => setCreating(null)}
        onCreated={(person) => {
          setCreating(null);
          setSearch("");
          onChange({ partnerId, staffIds: [...staffIds, person.id] });
        }}
      />
      <CreatePartnerModal
        open={creating === "customer"}
        initialName={typedName}
        onClose={() => setCreating(null)}
        onCreated={(id) => {
          setCreating(null);
          setSearch("");
          onChange({ partnerId: id, staffIds });
        }}
      />
    </>
  );
}
