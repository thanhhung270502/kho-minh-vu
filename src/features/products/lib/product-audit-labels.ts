import type { Lookups } from "../types";

/** Khóa là TÊN CỘT trong `nhat_ky_sua.truong` — không đổi sang tiếng Anh. */
export const FIELD_LABELS: Record<string, string> = {
  ma_hang: "Mã hàng",
  ten_hang: "Tên hàng",
  nhom_hang_id: "Nhóm hàng",
  dvt_id: "Đơn vị tính",
  cong_doan_id: "Công đoạn",
  quy_doi: "Quy đổi",
  kho_mac_dinh_id: "Kho mặc định",
  ton_toi_thieu: "Tồn tối thiểu",
  ton_toi_da: "Tồn tối đa",
  // Giá bán đã bỏ khỏi giao diện (Phase 10) — giữ nhãn để đọc nhật ký sửa cũ.
  gia_ban: "Giá bán",
  dang_kinh_doanh: "Đang kinh doanh",
  barcode: "Barcode",
  ghi_chu: "Ghi chú",
  loai_hang_id: "Loại hàng",
  dong_xe_id: "Dòng xe",
  duoc_ban_truc_tiep: "Được bán trực tiếp",
  vi_tri_ke: "Vị trí kệ",
  can_ra_dvt: "Cờ ĐVT mâu thuẫn",
  da_xac_nhan_ra: "Đã xác nhận rà",
};

/** Nhật ký lưu uuid — đổi sang tên để người đọc hiểu được. */
export function buildRenderValue(lookups: Lookups | undefined) {
  return (field: string, value: unknown) => {
    if (typeof value !== "string" || !lookups) return undefined;

    const items =
      field === "nhom_hang_id"
        ? lookups.categories
        : field === "dvt_id"
          ? lookups.units
          : field === "cong_doan_id"
            ? lookups.stages
            : field === "kho_mac_dinh_id"
              ? lookups.warehouses
              : field === "loai_hang_id"
                ? lookups.productTypes
                : field === "dong_xe_id"
                  ? lookups.vehicleLines
                  : null;

    return items?.find((item) => item.id === value)?.name;
  };
}
