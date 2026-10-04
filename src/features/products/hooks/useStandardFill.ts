import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { fetchStandardFillSources, fillStandardFields } from "../api/standard-fill.api";
import { productKeys } from "../api/product.keys";
import { chunk, type StandardFillChange } from "../lib/standard-fill";
import type { StageLookupItem } from "../types";

/** RPC nhận tối đa 1.000 dòng; 500 giữ mỗi request ngắn để thanh tiến độ nhích đều. */
const BATCH_SIZE = 500;

export function useStandardFillSources(stages: ReadonlyArray<StageLookupItem> | undefined, enabled: boolean) {
  return useQuery({
    queryKey: productKeys.standardFillSources,
    queryFn: () => fetchStandardFillSources(stages ?? []),
    enabled: enabled && stages !== undefined,
    // Mỗi lần mở hộp thoại phải thấy số mới nhất — vừa có người sửa mã thì xem trước sai.
    staleTime: 0,
  });
}

export function useFillStandardFields() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      changes: ReadonlyArray<StandardFillChange>;
      onProgress: (done: number) => void;
    }) => {
      // Tuần tự từng lô: lô lỗi giữa chừng thì các lô trước đã ghi — RPC chỉ lấp
      // ô trống nên bấm lại an toàn, không ghi đè.
      let changed = 0;
      let done = 0;
      for (const batch of chunk(input.changes, BATCH_SIZE)) {
        changed += await fillStandardFields(batch);
        done += batch.length;
        input.onProgress(done);
      }
      return changed;
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: productKeys.all });
      void queryClient.invalidateQueries({ queryKey: ["audit-log", "san_pham"] });
    },
  });
}
