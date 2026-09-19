/**
 * Định nghĩa cột của mẫu Excel hệ mới — dùng chung cho cả xuất và nhập, để file
 * xuất ra sửa xong nhập lại được ngay (D-23).
 *
 * File này KHÔNG import `node:` hay `exceljs` nên dùng được cả ở Client Component
 * (hiện tên cột trong bảng lỗi, tooltip hướng dẫn).
 */

export type KhoaCot =
  | "ma_hang"
  | "ten_hang"
  | "nhom_hang"
  | "dvt"
  | "cong_doan"
  | "quy_doi"
  | "kho_mac_dinh"
  | "ton_toi_thieu"
  | "ton_toi_da"
  | "gia_ban"
  | "dang_kinh_doanh"
  | "barcode"
  | "ghi_chu"
  | "tong_ton"
  | "gia_von";

export type CotMau = {
  khoa: KhoaCot;
  title: string;
  rong: number;
  /** Cột chỉ để xem khi xuất; nhập vào bị bỏ qua. */
  chiXuat?: boolean;
};

export const COT_MAU: readonly CotMau[] = [
  { khoa: "ma_hang", title: "Mã hàng", rong: 22 },
  { khoa: "ten_hang", title: "Tên hàng", rong: 48 },
  { khoa: "nhom_hang", title: "Nhóm hàng", rong: 28 },
  { khoa: "dvt", title: "Đơn vị tính", rong: 14 },
  { khoa: "cong_doan", title: "Công đoạn", rong: 14 },
  { khoa: "quy_doi", title: "Quy đổi", rong: 10 },
  { khoa: "kho_mac_dinh", title: "Kho mặc định", rong: 14 },
  { khoa: "ton_toi_thieu", title: "Tồn tối thiểu", rong: 14 },
  { khoa: "ton_toi_da", title: "Tồn tối đa", rong: 12 },
  { khoa: "gia_ban", title: "Giá bán", rong: 14 },
  { khoa: "dang_kinh_doanh", title: "Đang kinh doanh", rong: 16 },
  { khoa: "barcode", title: "Barcode", rong: 16 },
  { khoa: "ghi_chu", title: "Ghi chú", rong: 30 },
  { khoa: "tong_ton", title: "Tồn hiện tại", rong: 13, chiXuat: true },
  { khoa: "gia_von", title: "Giá vốn", rong: 14, chiXuat: true },
];

export const NHAN_COT: Record<string, string> = Object.fromEntries(
  COT_MAU.map((c) => [c.khoa, c.title]),
);

/** Tên cột tiếng Việt cho những khóa không nằm trong mẫu (RPC trả về). */
export function nhanCot(khoa: string): string {
  return NHAN_COT[khoa] ?? khoa;
}

/**
 * Một dòng gửi cho RPC `nhap_danh_muc` — khóa trùng đúng hợp đồng jsonb của nó.
 * Khóa vắng mặt hoặc `null` nghĩa là GIỮ NGUYÊN giá trị cũ khi sửa.
 */
export type DongNhap = {
  dong: number;
  ma_hang: string | null;
  ten_hang?: string | null;
  nhom_hang?: string | null;
  dvt?: string | null;
  cong_doan?: string | null;
  /** Chỉ dùng khi mã CHƯA có: file KiotViet không suy được công đoạn cho mã "CÁI". */
  cong_doan_khi_tao_moi?: string | null;
  quy_doi?: number | null;
  kho_mac_dinh?: string | null;
  ton_toi_thieu?: number | null;
  ton_toi_da?: number | null;
  gia_ban?: number | null;
  dang_kinh_doanh?: boolean | null;
  barcode?: string | null;
  ghi_chu?: string | null;
};

/** Một dòng để ghi ra file mẫu hệ mới. */
export type DongXuat = DongNhap & {
  tong_ton?: number | null;
  gia_von?: number | null;
};

export const GIOI_HAN_FILE_MB = 5;
