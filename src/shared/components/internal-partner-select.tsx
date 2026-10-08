"use client";

import { Select } from "antd";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";

import {
  DEFAULT_INTERNAL_PARTNER_CODE,
  fetchInternalPartners,
  internalPartnerKeys,
} from "@/shared/api/internal-partner.api";
import { partnerLabel, type PartnerRef } from "@/shared/lib/recipient";
import { filterByLabel } from "@/shared/lib/text";

type Props = {
  value: string | undefined;
  /** Đối tác đang gắn với đơn — đơn cũ có thể là đối tác ngoài NB, vẫn phải hiện tên. */
  current: PartnerRef | null;
  onChange: (partnerId: string | undefined) => void;
  /** Đang trống thì tự chọn NB001 khi danh sách tải xong (form tạo mới). */
  autoDefault?: boolean;
  autoFocus?: boolean;
};

/** Ô Người nhận của đơn đặt và hóa đơn: chỉ đối tác nội bộ mã NB…, mặc định NB001 (0119). */
export function InternalPartnerSelect({ value, current, onChange, autoDefault, autoFocus }: Props) {
  const partners = useQuery({ queryKey: internalPartnerKeys.all, queryFn: fetchInternalPartners });

  const defaultId = partners.data?.find((p) => p.code === DEFAULT_INTERNAL_PARTNER_CODE)?.id;
  useEffect(() => {
    if (autoDefault && !value && defaultId) onChange(defaultId);
  }, [autoDefault, value, defaultId, onChange]);

  const options = (partners.data ?? []).map((p) => ({ value: p.id, label: partnerLabel(p) }));
  if (current && !options.some((o) => o.value === current.id)) {
    options.unshift({ value: current.id, label: partnerLabel(current) });
  }

  return (
    <Select
      showSearch
      autoFocus={autoFocus}
      // Không cho xóa trắng: đơn mặc định NB001 (0119), chỉ đổi qua mã NB khác.
      className="w-full"
      placeholder="Chọn mã NB"
      value={value}
      loading={partners.isPending}
      options={options}
      filterOption={filterByLabel}
      onChange={(id) => onChange(id ?? undefined)}
      notFoundContent={
        partners.isError
          ? "Không tải được danh sách. Đóng rồi mở lại trang."
          : "Chưa có đối tác nội bộ mã NB… — thêm ở màn Đối tác."
      }
    />
  );
}
