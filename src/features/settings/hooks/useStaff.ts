import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { internalRecipientKeys } from "@/shared/api/internal-recipient.api";

import { fetchStaff, saveStaff, staffKeys } from "../api/staff.api";
import type { StaffFormValues } from "../schemas/staff.schema";

export function useStaff() {
  return useQuery({ queryKey: staffKeys.all, queryFn: fetchStaff });
}

export function useSaveStaff() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: { id: string | null; values: StaffFormValues }) =>
      saveStaff(input.id, input.values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: staffKeys.all });
      // Ô chọn người nhận ở Đặt hàng / Hóa đơn đọc cùng bảng qua RPC.
      void queryClient.invalidateQueries({ queryKey: internalRecipientKeys.all });
    },
  });
}
