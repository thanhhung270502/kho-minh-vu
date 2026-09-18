import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  capNhatMucDanhMucPhu,
  layDanhMucPhu,
  taoMucDanhMucPhu,
  xoaMucDanhMucPhu,
  type BangDanhMucPhu,
  type GiaTriDanhMucPhu,
} from "../api/danh-muc-phu.api";

export const khoaDanhMucPhu = {
  tatCa: ["danh-muc-phu"] as const,
  bang: (b: BangDanhMucPhu) => ["danh-muc-phu", b] as const,
};

export function useDanhMucPhu(bang: BangDanhMucPhu) {
  return useQuery({
    queryKey: khoaDanhMucPhu.bang(bang),
    queryFn: () => layDanhMucPhu(bang),
  });
}

/** Danh mục hàng (plan 11) cũng cache dưới `["danh-muc-phu"]` — xóa cả cụm. */
function dungKhoaCu(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: khoaDanhMucPhu.tatCa });
}

export function useLuuDanhMucPhu(bang: BangDanhMucPhu) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (v: { id: string | null; giaTri: GiaTriDanhMucPhu }) =>
      v.id
        ? capNhatMucDanhMucPhu(bang, v.id, v.giaTri)
        : taoMucDanhMucPhu(bang, v.giaTri),
    onSuccess: () => dungKhoaCu(queryClient),
  });
}

export function useXoaDanhMucPhu(bang: BangDanhMucPhu) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => xoaMucDanhMucPhu(bang, id),
    onSuccess: () => dungKhoaCu(queryClient),
  });
}
