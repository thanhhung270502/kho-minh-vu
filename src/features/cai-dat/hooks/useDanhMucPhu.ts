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
  table: (b: BangDanhMucPhu) => ["danh-muc-phu", b] as const,
};

export function useDanhMucPhu(table: BangDanhMucPhu) {
  return useQuery({
    queryKey: khoaDanhMucPhu.table(table),
    queryFn: () => layDanhMucPhu(table),
  });
}

/** Danh mục hàng (plan 11) cũng cache dưới `["danh-muc-phu"]` — xóa cả cụm. */
function dungKhoaCu(queryClient: ReturnType<typeof useQueryClient>) {
  void queryClient.invalidateQueries({ queryKey: khoaDanhMucPhu.tatCa });
}

export function useLuuDanhMucPhu(table: BangDanhMucPhu) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (v: { id: string | null; giaTri: GiaTriDanhMucPhu }) =>
      v.id
        ? capNhatMucDanhMucPhu(table, v.id, v.giaTri)
        : taoMucDanhMucPhu(table, v.giaTri),
    onSuccess: () => dungKhoaCu(queryClient),
  });
}

export function useXoaDanhMucPhu(table: BangDanhMucPhu) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => xoaMucDanhMucPhu(table, id),
    onSuccess: () => dungKhoaCu(queryClient),
  });
}
