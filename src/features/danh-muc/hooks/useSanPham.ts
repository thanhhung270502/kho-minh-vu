import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import {
  apDungGoiYCongDoan,
  capNhatSanPham,
  ganHangLoat,
  layChiTietSanPham,
  layDanhMucPhu,
  layDanhSachSanPham,
  layGoiYCongDoan,
  layTheKho,
  layTonTheoKho,
  taoSanPham,
  xacNhanDaRa,
  type ThayDoiHangLoat,
} from "../api/san-pham.api";
import { khoaSanPham } from "../api/san-pham.keys";
import type { BoLocSanPham } from "../schemas/bo-loc.schema";
import type { SanPhamInput } from "../types";

export function useDanhSachSanPham(boLoc: BoLocSanPham) {
  return useQuery({
    queryKey: khoaSanPham.danhSach(boLoc),
    queryFn: () => layDanhSachSanPham(boLoc),
    // Giữ bảng cũ trong lúc tải trang mới: đổi trang không nháy trắng.
    placeholderData: keepPreviousData,
  });
}

export function useChiTietSanPham(id: string) {
  return useQuery({
    queryKey: khoaSanPham.chiTiet(id),
    queryFn: () => layChiTietSanPham(id),
  });
}

export function useTheKho(sanPhamId: string, khoId: string | null, trang: number) {
  return useQuery({
    queryKey: khoaSanPham.theKho(sanPhamId, khoId, trang),
    queryFn: () => layTheKho(sanPhamId, khoId, trang),
    placeholderData: keepPreviousData,
  });
}

export function useTonTheoKho(sanPhamId: string) {
  return useQuery({
    queryKey: khoaSanPham.tonTheoKho(sanPhamId),
    queryFn: () => layTonTheoKho(sanPhamId),
  });
}

export function useDanhMucPhu() {
  return useQuery({
    queryKey: khoaSanPham.danhMucPhu,
    queryFn: layDanhMucPhu,
    // Nhóm hàng / ĐVT / công đoạn đổi vài lần một tháng, không cần hỏi lại liên tục.
    staleTime: 5 * 60_000,
  });
}

export function useGoiYCongDoan(bat: boolean) {
  return useQuery({
    queryKey: khoaSanPham.goiYCongDoan,
    queryFn: layGoiYCongDoan,
    enabled: bat,
  });
}

/** Mọi mutation đều làm mới cả danh sách lẫn nhật ký sửa của mã. */
function useLamMoiSanPham() {
  const queryClient = useQueryClient();

  return () => {
    void queryClient.invalidateQueries({ queryKey: khoaSanPham.tatCa });
    void queryClient.invalidateQueries({ queryKey: ["lich-su-sua", "san_pham"] });
  };
}

export function useLuuSanPham() {
  const lamMoi = useLamMoiSanPham();

  return useMutation({
    mutationFn: async (v: {
      id?: string;
      giaTri: SanPhamInput;
      guiGiaBan: boolean;
    }) => {
      if (v.id) {
        await capNhatSanPham(v.id, v.giaTri, v.guiGiaBan);
        return v.id;
      }
      return taoSanPham(v.giaTri, v.guiGiaBan);
    },
    onSuccess: lamMoi,
  });
}

export function useGanHangLoat() {
  const lamMoi = useLamMoiSanPham();

  return useMutation({
    mutationFn: (v: {
      ids: string[];
      thayDoi: ThayDoiHangLoat;
      nguon: "hang_loat" | "sua_o";
    }) => ganHangLoat(v.ids, v.thayDoi, v.nguon),
    onSuccess: lamMoi,
  });
}

export function useApDungGoiY() {
  const lamMoi = useLamMoiSanPham();

  return useMutation({
    mutationFn: (ids: string[]) => apDungGoiYCongDoan(ids),
    onSuccess: lamMoi,
  });
}

export function useXacNhanDaRa() {
  const lamMoi = useLamMoiSanPham();

  return useMutation({
    mutationFn: (ids: string[]) => xacNhanDaRa(ids),
    onSuccess: lamMoi,
  });
}
