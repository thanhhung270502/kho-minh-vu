import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { khoaSanPham } from "@/features/danh-muc/api/san-pham.keys";

import {
  capNhatDauPhieu,
  capNhatDong,
  ghiSo,
  huyPhieu,
  layChiTietPhieu,
  layDanhSachPhieu,
  layDongPhieu,
  taoPhieuNhap,
  themDong,
  xoaDong,
  type DauPhieuMoi,
} from "../api/phieu-nhap.api";
import { khoaPhieuNhap } from "../api/phieu-nhap.keys";
import type {
  BoLocPhieu,
  DauPhieuInput,
  DongPhieuInput,
} from "../schemas/phieu-nhap.schema";

export function useDanhSachPhieu(boLoc: BoLocPhieu) {
  return useQuery({
    queryKey: khoaPhieuNhap.danhSach(boLoc),
    queryFn: () => layDanhSachPhieu(boLoc),
    placeholderData: keepPreviousData,
  });
}

export function useChiTietPhieu(id: string) {
  return useQuery({
    queryKey: khoaPhieuNhap.chiTiet(id),
    queryFn: () => layChiTietPhieu(id),
    // Ngăn kéo/tạo mới truyền id rỗng — không chặn là bắn RPC uuid rỗng (bẫy 10).
    enabled: id !== "",
  });
}

export function useDongPhieu(id: string) {
  return useQuery({
    queryKey: khoaPhieuNhap.dong(id),
    queryFn: () => layDongPhieu(id),
    enabled: id !== "",
  });
}

/** Sửa dòng/đầu phiếu chỉ đụng chính phiếu đó. */
function useLamMoiPhieu(id?: string) {
  const queryClient = useQueryClient();

  return () => {
    if (id) {
      void queryClient.invalidateQueries({ queryKey: khoaPhieuNhap.chiTiet(id) });
      void queryClient.invalidateQueries({ queryKey: khoaPhieuNhap.dong(id) });
    }
    void queryClient.invalidateQueries({ queryKey: khoaPhieuNhap.tatCa });
  };
}

export function useTaoPhieu() {
  const lamMoi = useLamMoiPhieu();
  return useMutation({ mutationFn: (v: DauPhieuMoi) => taoPhieuNhap(v), onSuccess: lamMoi });
}

export function useSuaDauPhieu(id: string) {
  const lamMoi = useLamMoiPhieu(id);
  return useMutation({
    mutationFn: (v: Partial<DauPhieuInput>) => capNhatDauPhieu(id, v),
    onSuccess: lamMoi,
  });
}

export function useThemDong(chungTuId: string) {
  const lamMoi = useLamMoiPhieu(chungTuId);
  return useMutation({
    mutationFn: (d: DongPhieuInput) => themDong(chungTuId, d),
    onSuccess: lamMoi,
  });
}

export function useSuaDong(chungTuId: string) {
  const lamMoi = useLamMoiPhieu(chungTuId);
  return useMutation({
    mutationFn: (v: { id: string; giaTri: Partial<DongPhieuInput> }) =>
      capNhatDong(v.id, v.giaTri),
    onSuccess: lamMoi,
  });
}

export function useXoaDong(chungTuId: string) {
  const lamMoi = useLamMoiPhieu(chungTuId);
  return useMutation({ mutationFn: (id: string) => xoaDong(id), onSuccess: lamMoi });
}

/**
 * Ghi sổ và hủy làm ĐỔI TỒN và GIÁ VỐN — phải làm mới cả cache danh mục và
 * thẻ kho, không chỉ cache phiếu.
 */
function useLamMoiSauGhiSo(id: string) {
  const queryClient = useQueryClient();
  const lamMoiPhieu = useLamMoiPhieu(id);

  return () => {
    lamMoiPhieu();
    void queryClient.invalidateQueries({ queryKey: khoaSanPham.tatCa });
    void queryClient.invalidateQueries({ queryKey: ["san-pham", "the-kho"] });
  };
}

export function useGhiSo(id: string) {
  const lamMoi = useLamMoiSauGhiSo(id);
  return useMutation({ mutationFn: () => ghiSo(id), onSuccess: lamMoi });
}

export function useHuyPhieu(id: string) {
  const lamMoi = useLamMoiSauGhiSo(id);
  return useMutation({ mutationFn: (lyDo: string) => huyPhieu(id, lyDo), onSuccess: lamMoi });
}
