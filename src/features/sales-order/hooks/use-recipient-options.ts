"use client";

import { useCustomerBrief, useCustomerLookup } from "@/shared/hooks/use-customer-lookup";
import { useInternalRecipients } from "@/shared/hooks/use-internal-recipients";
import type { StaffRef } from "@/shared/lib/recipient";
import { removeDiacritics } from "@/shared/lib/text";

// Khách và nhân viên chung một ô: giá trị khách mang tiền tố để tách lại.
export const CUSTOMER_PREFIX = "kh:";

export type RecipientOption = { value: string; label: string; search: string };

/**
 * Lựa chọn cho ô người nhận: mặc định chỉ nhân viên phụ trách; khách chỉ hiện khi
 * đã gõ chữ (tìm sau khi ngừng gõ, xem useCustomerLookup) hoặc đang là giá trị.
 */
export function useRecipientOptions(
  typed: string,
  partnerId: string | undefined,
  extraStaff: StaffRef[] | undefined,
) {
  const staff = useInternalRecipients();
  const customers = useCustomerLookup(typed);
  const selectedPartner = useCustomerBrief(partnerId);

  const staffOptions: RecipientOption[] = (staff.data ?? []).map((person) => ({
    value: person.id,
    label: person.name,
    search: `${person.shortName} ${person.name}`,
  }));
  const known = new Set(staffOptions.map((option) => option.value));
  for (const person of extraStaff ?? []) {
    if (!known.has(person.id))
      staffOptions.push({ value: person.id, label: person.name, search: person.name });
  }

  const customerOptions: RecipientOption[] = [];
  if (partnerId) {
    const detail = selectedPartner.data;
    customerOptions.push({
      value: CUSTOMER_PREFIX + partnerId,
      label: detail ? `KH · ${detail.name}` : "KH · Đang tải…",
      search: detail ? `${detail.code} ${detail.name}` : "",
    });
  }
  if (typed !== "") {
    for (const customer of customers.data ?? []) {
      if (customer.id === partnerId) continue;
      customerOptions.push({
        value: CUSTOMER_PREFIX + customer.id,
        label: `Khách hàng: ${customer.code} ${customer.name}`,
        search: `${customer.code} ${customer.name}`,
      });
    }
  }

  // Gõ đúng tên một người đã có thì không mời thêm mới — tránh tạo trùng người.
  const typedKey = removeDiacritics(typed).toLowerCase();
  const exactStaff = (staff.data ?? []).some(
    (person) =>
      removeDiacritics(person.name).toLowerCase() === typedKey ||
      removeDiacritics(person.shortName).toLowerCase() === typedKey,
  );

  return {
    options: [...staffOptions, ...customerOptions],
    exactStaff,
    loading: staff.isLoading || customers.isFetching,
  };
}
