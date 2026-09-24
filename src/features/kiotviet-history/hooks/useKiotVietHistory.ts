"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";

import {
  fetchKiotVietHistory,
  fetchKiotVietVoucher,
} from "../api/kiotviet-history.api";
import { kiotVietHistoryKeys } from "../api/kiotviet-history.keys";
import {
  toHistoryRpcArgs,
  type KiotVietHistoryFilter,
} from "../schemas/history-filter.schema";

export function useKiotVietHistory(
  filter: KiotVietHistoryFilter,
  extra?: { productId?: string },
) {
  const args = toHistoryRpcArgs(filter, extra);

  return useQuery({
    queryKey: kiotVietHistoryKeys.list(args),
    queryFn: () => fetchKiotVietHistory(args),
    // Giữ bảng cũ trong lúc tải trang mới: đổi trang không nháy trắng.
    placeholderData: keepPreviousData,
  });
}

export function useKiotVietVoucher(type: "NHAP" | "XUAT", voucherNo: string) {
  return useQuery({
    queryKey: kiotVietHistoryKeys.voucher(type, voucherNo),
    queryFn: () => fetchKiotVietVoucher(type, voucherNo),
    // Drawer chưa mở phiếu nào thì voucherNo rỗng — chặn ở đây, không bắn RPC
    // rỗng (bẫy 10 CLAUDE.md).
    enabled: voucherNo !== "",
  });
}
