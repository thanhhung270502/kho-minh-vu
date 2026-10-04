"use client";

import { PlusOutlined } from "@ant-design/icons";
import { Button, Divider, Select } from "antd";
import { useState } from "react";

import { useCustomerSearch } from "@/features/partners/hooks/useNoteReview";
import { usePartnerDetail } from "@/features/partners/hooks/usePartners";
import { CreatePartnerModal } from "@/shared/components/partner-search-input";
import { QuickStaffModal } from "@/shared/components/quick-staff-modal";
import { useInternalRecipients } from "@/shared/hooks/use-internal-recipients";
import type { StaffRef } from "@/shared/lib/recipient";
import { labelMatches, removeDiacritics } from "@/shared/lib/text";

export type RecipientValue = {
  partnerId: string | undefined;
  staffIds: string[];
};

type Props = RecipientValue & {
  extraStaff?: StaffRef[];
  /** Luôn gửi cả tập: có partnerId = đơn "Đối tác", không có = "Nội bộ". */
  onChange: (next: RecipientValue) => void;
  onEnterWhenEmpty?: () => void;
  autoFocus?: boolean;
};

// Khách và nhân viên chung một ô: giá trị khách mang tiền tố để tách lại.
const CUSTOMER_PREFIX = "kh:";

type Option = { value: string; label: string; search: string };

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
  onEnterWhenEmpty,
  autoFocus,
}: Props) {
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState<"staff" | "customer" | null>(null);
  const [typedName, setTypedName] = useState("");
  const typed = search.trim();

  const staff = useInternalRecipients();
  const customers = useCustomerSearch(typed, typed !== "");
  const currentPartnerId = partnerId;
  const selectedPartner = usePartnerDetail(currentPartnerId ?? null);

  const staffOptions: Option[] = (staff.data ?? []).map((person) => ({
    value: person.id,
    label: person.name,
    search: `${person.shortName} ${person.name}`,
  }));
  const known = new Set(staffOptions.map((option) => option.value));
  for (const person of extraStaff ?? []) {
    if (!known.has(person.id))
      staffOptions.push({
        value: person.id,
        label: person.name,
        search: person.name,
      });
  }

  const customerOptions: Option[] = [];
  if (currentPartnerId) {
    const detail = selectedPartner.data;
    customerOptions.push({
      value: CUSTOMER_PREFIX + currentPartnerId,
      label: detail ? `KH · ${detail.name}` : "KH · Đang tải…",
      search: detail ? `${detail.code} ${detail.name}` : "",
    });
  }
  if (typed !== "") {
    for (const customer of customers.data ?? []) {
      if (customer.id === currentPartnerId) continue;
      customerOptions.push({
        value: CUSTOMER_PREFIX + customer.id,
        label: `Khách hàng: ${customer.code} ${customer.name}`,
        search: `${customer.code} ${customer.name}`,
      });
    }
  }

  const value = [
    ...staffIds,
    ...(currentPartnerId ? [CUSTOMER_PREFIX + currentPartnerId] : []),
  ];
  // Gõ đúng tên một người đã có thì không mời thêm mới — tránh tạo trùng người.
  const typedKey = removeDiacritics(typed).toLowerCase();
  const exactStaff = (staff.data ?? []).some(
    (person) =>
      removeDiacritics(person.name).toLowerCase() === typedKey ||
      removeDiacritics(person.shortName).toLowerCase() === typedKey,
  );

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
    // Pha capture chạy TRƯỚC rc-select (bẫy 14): Enter ở ô trống = gửi form.
    <div
      onKeyDownCapture={(event) => {
        if (
          event.key === "Enter" &&
          typed === "" &&
          value.length > 0 &&
          onEnterWhenEmpty
        ) {
          event.preventDefault();
          event.stopPropagation();
          onEnterWhenEmpty();
        }
      }}
    >
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
        loading={staff.isLoading || customers.isFetching}
        onChange={handleChange}
        options={[...staffOptions, ...customerOptions]}
        notFoundContent={
          typed ? (
            <span className="text-xs text-chu-phu">{`Chưa có ai tên "${typed}".`}</span>
          ) : null
        }
        popupRender={(menu) => (
          <>
            {menu}
            {typed && !exactStaff ? (
              <>
                <Divider className="my-1" />
                <div className="flex flex-col items-start px-2 pb-1">
                  <Button
                    type="link"
                    size="small"
                    className="h-auto px-0"
                    icon={<PlusOutlined />}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openCreate("staff")}
                  >
                    {`Thêm nhân viên phụ trách "${typed}"`}
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    className="h-auto px-0"
                    icon={<PlusOutlined />}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => openCreate("customer")}
                  >
                    {`Thêm khách hàng "${typed}"`}
                  </Button>
                </div>
              </>
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
    </div>
  );
}
