import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  fetchPartnerDetail,
  fetchPartners,
  fetchTransactionHistory,
  savePartner,
  suggestPartnerCode,
} from "../api/partner.api";
import { partnerKeys } from "../api/partner.keys";
import type { PartnerInput } from "../schemas/partner.schema";
import type { PartnerFilter, PartnerKind } from "../types";

export function usePartners(filter: PartnerFilter) {
  return useQuery({
    queryKey: partnerKeys.list(filter),
    queryFn: () => fetchPartners(filter),
    placeholderData: keepPreviousData,
  });
}

export function usePartnerDetail(id: string | null) {
  return useQuery({
    queryKey: partnerKeys.detail(id ?? ""),
    queryFn: () => fetchPartnerDetail(id as string),
    enabled: Boolean(id),
  });
}

export function useSuggestedPartnerCode(kind: PartnerKind, enabled: boolean) {
  return useQuery({
    queryKey: partnerKeys.suggestedCode(kind),
    queryFn: () => suggestPartnerCode(kind),
    enabled,
    // Mã gợi ý chỉ là gợi ý; hỏi lại mỗi lần mở form để không trùng mã vừa tạo.
    staleTime: 0,
    gcTime: 0,
  });
}

export function useSavePartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string | null; values: PartnerInput }) =>
      savePartner(input.id, input.values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: partnerKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["audit-log", "doi_tac"] });
    },
  });
}

export function useTransactionHistory(partnerId: string, page: number) {
  return useQuery({
    queryKey: partnerKeys.history(partnerId, page),
    queryFn: () => fetchTransactionHistory(partnerId, page),
    placeholderData: keepPreviousData,
  });
}
