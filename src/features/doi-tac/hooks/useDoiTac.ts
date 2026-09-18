import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  goiYMaDoiTac,
  layChiTietDoiTac,
  layDanhSachDoiTac,
  layLichSuGiaoDich,
  luuDoiTac,
} from "../api/doi-tac.api";
import { khoaDoiTac } from "../api/doi-tac.keys";
import type { DoiTacLuu } from "../schemas/doi-tac.schema";
import type { BoLocDoiTac, LoaiDoiTac } from "../types";

export function useDanhSachDoiTac(boLoc: BoLocDoiTac) {
  return useQuery({
    queryKey: khoaDoiTac.danhSach(boLoc),
    queryFn: () => layDanhSachDoiTac(boLoc),
    placeholderData: keepPreviousData,
  });
}

export function useChiTietDoiTac(id: string | null) {
  return useQuery({
    queryKey: khoaDoiTac.chiTiet(id ?? ""),
    queryFn: () => layChiTietDoiTac(id as string),
    enabled: Boolean(id),
  });
}

export function useGoiYMaDoiTac(loai: LoaiDoiTac, bat: boolean) {
  return useQuery({
    queryKey: khoaDoiTac.maGoiY(loai),
    queryFn: () => goiYMaDoiTac(loai),
    enabled: bat,
    // Mã gợi ý chỉ là gợi ý; hỏi lại mỗi lần mở form để không trùng mã vừa tạo.
    staleTime: 0,
    gcTime: 0,
  });
}

export function useLuuDoiTac() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (v: { id: string | null; giaTri: DoiTacLuu }) => luuDoiTac(v.id, v.giaTri),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: khoaDoiTac.tatCa });
      void queryClient.invalidateQueries({ queryKey: ["lich-su-sua", "doi_tac"] });
    },
  });
}

export function useLichSuGiaoDich(doiTacId: string, trang: number) {
  return useQuery({
    queryKey: khoaDoiTac.lichSu(doiTacId, trang),
    queryFn: () => layLichSuGiaoDich(doiTacId, trang),
    placeholderData: keepPreviousData,
  });
}
