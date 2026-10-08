"use client";

import { Select } from "antd";
import { useQuery } from "@tanstack/react-query";

import { partnerLabel, type PartnerRef } from "@/shared/lib/recipient";
import { filterByLabel } from "@/shared/lib/text";

import { fetchInternalPartners } from "../api/order.api";
import { orderKeys } from "../api/order.keys";

type Props = {
  value: string | undefined;
  /** Đối tác đang gắn với đơn — đơn cũ có thể là đối tác ngoài NB, vẫn phải hiện tên. */
  current: PartnerRef | null;
  onChange: (partnerId: string | undefined) => void;
};

/** Ô Người nhận của đơn: chỉ các đối tác nội bộ mã NB… (yêu cầu 08/10/2026). */
export function InternalPartnerSelect({ value, current, onChange }: Props) {
  const partners = useQuery({ queryKey: orderKeys.internalPartners, queryFn: fetchInternalPartners });

  const options = (partners.data ?? []).map((p) => ({ value: p.id, label: partnerLabel(p) }));
  if (current && !options.some((o) => o.value === current.id)) {
    options.unshift({ value: current.id, label: partnerLabel(current) });
  }

  return (
    <Select
      showSearch
      allowClear
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
