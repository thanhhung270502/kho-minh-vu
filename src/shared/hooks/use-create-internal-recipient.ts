"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";

import {
  createInternalRecipient,
  internalRecipientKeys,
} from "@/shared/api/internal-recipient.api";

export function useCreateInternalRecipient() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createInternalRecipient,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: internalRecipientKeys.all,
      });
      // Bảng Cài đặt → Nhân viên phụ trách dùng khóa "staff" (features/settings).
      void queryClient.invalidateQueries({ queryKey: ["staff"] });
    },
  });
}
