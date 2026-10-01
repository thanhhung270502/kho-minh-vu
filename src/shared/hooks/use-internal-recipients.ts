"use client";

import { useQuery } from "@tanstack/react-query";

import {
  fetchInternalRecipients,
  internalRecipientKeys,
} from "@/shared/api/internal-recipient.api";

/** Vài chục tài khoản, ít đổi — tải một lần, lọc ở client. */
export function useInternalRecipients(enabled = true) {
  return useQuery({
    queryKey: internalRecipientKeys.all,
    queryFn: fetchInternalRecipients,
    staleTime: 5 * 60_000,
    enabled,
  });
}
