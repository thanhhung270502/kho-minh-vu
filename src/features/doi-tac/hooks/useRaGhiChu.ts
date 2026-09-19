import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { khoaDoiTac } from "../api/doi-tac.keys";
import {
  boQuyetGhiChu,
  demGhiChu,
  khoaRaGhiChu,
  layGhiChu,
  quyetGhiChu,
  timKhach,
  type BoLocGhiChu,
  type QuyetDinh,
} from "../api/ra-ghi-chu.api";

export function useGhiChu(filter: BoLocGhiChu) {
  return useQuery({
    queryKey: khoaRaGhiChu.danhSach(filter),
    queryFn: () => layGhiChu(filter),
    placeholderData: keepPreviousData,
  });
}

export function useDemGhiChu() {
  return useQuery({ queryKey: khoaRaGhiChu.dem, queryFn: demGhiChu });
}

/** Quyết một giá trị có thể TẠO đối tác mới → làm mới cả hai cụm cache. */
function useLamMoi() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: khoaRaGhiChu.tatCa });
    void queryClient.invalidateQueries({ queryKey: khoaDoiTac.tatCa });
  };
}

export function useQuyetGhiChu() {
  const lamMoi = useLamMoi();
  return useMutation({ mutationFn: (q: QuyetDinh) => quyetGhiChu(q), onSuccess: lamMoi });
}

export function useBoQuyetGhiChu() {
  const lamMoi = useLamMoi();
  return useMutation({ mutationFn: (giaTri: string) => boQuyetGhiChu(giaTri), onSuccess: lamMoi });
}

export function useTimKhach(q: string) {
  return useQuery({
    queryKey: khoaRaGhiChu.timKhach(q),
    queryFn: () => timKhach(q),
    staleTime: 30_000,
  });
}
