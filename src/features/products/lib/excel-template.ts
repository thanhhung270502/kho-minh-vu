/**
 * Định nghĩa cột của mẫu Excel hệ mới — dùng chung cho cả xuất và nhập, để file
 * xuất ra sửa xong nhập lại được ngay (D-23).
 *
 * File này KHÔNG import `node:` hay `exceljs` nên dùng được cả ở Client Component
 * (hiện tên cột trong bảng lỗi, tooltip hướng dẫn).
 *
 * Giá trị của `ColumnKey` là hợp đồng jsonb với RPC `nhap_danh_muc` — giữ nguyên
 * chuỗi tiếng Việt, chỉ tên định danh TypeScript là tiếng Anh.
 */

export type ColumnKey =
  | "ma_hang"
  | "ten_hang"
  | "nhom_hang"
  | "dvt"
  | "cong_doan"
  | "quy_doi"
  | "kho_mac_dinh"
  | "ton_toi_thieu"
  | "ton_toi_da"
  | "dang_kinh_doanh"
  | "barcode"
  | "mo_ta"
  | "tong_ton";

export type TemplateColumn = {
  key: ColumnKey;
  title: string;
  width: number;
  /** Cột chỉ để xem khi xuất; nhập vào bị bỏ qua. */
  exportOnly?: boolean;
};

/**
 * Theo file "danh-muc-20261008-1637" (08/10/2026): 9 cột. Vị trí = kho mặc định (như cột
 * "Vị trí" của KiotViet). Quy đổi, Tồn tối thiểu/tối đa, Barcode không còn trong mẫu —
 * file cũ có các cột đó vẫn đọc được (parseTemplateRow), ô vắng = giữ nguyên.
 */
export const TEMPLATE_COLUMNS: readonly TemplateColumn[] = [
  { key: "ma_hang", title: "Mã hàng", width: 22 },
  { key: "ten_hang", title: "Tên hàng", width: 48 },
  { key: "nhom_hang", title: "Nhóm hàng", width: 22 },
  { key: "tong_ton", title: "Tồn kho", width: 10, exportOnly: true },
  { key: "dvt", title: "Đơn vị tính", width: 13 },
  { key: "cong_doan", title: "Xử lý", width: 12 },
  { key: "dang_kinh_doanh", title: "Đang kinh doanh", width: 16 },
  // 0086: Ghi chú là cột tự sinh — file chỉ còn Mô tả (file cũ cột "Ghi chú" vẫn đọc vào Mô tả).
  { key: "mo_ta", title: "Mô tả", width: 30 },
  { key: "kho_mac_dinh", title: "Vị trí", width: 12 },
];

export const COLUMN_LABELS: Record<string, string> = {
  // Cột của mẫu cũ — file cũ vẫn nhập được, bảng lỗi cần đúng tên cột.
  quy_doi: "Quy đổi",
  ton_toi_thieu: "Tồn tối thiểu",
  ton_toi_da: "Tồn tối đa",
  barcode: "Barcode",
  ...Object.fromEntries(TEMPLATE_COLUMNS.map((column) => [column.key, column.title])),
};

/** Tên cột tiếng Việt cho những khóa không nằm trong mẫu (RPC trả về). */
export function columnLabel(key: string): string {
  return COLUMN_LABELS[key] ?? key;
}

/**
 * Một dòng gửi cho RPC `nhap_danh_muc` — khóa trùng đúng hợp đồng jsonb của nó.
 * Khóa vắng mặt hoặc `null` nghĩa là GIỮ NGUYÊN giá trị cũ khi sửa.
 */
export type ImportRowPayload = {
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
  dang_kinh_doanh?: boolean | null;
  barcode?: string | null;
  mo_ta?: string | null;
};

/** Một dòng để ghi ra file mẫu hệ mới. */
export type ExportRowPayload = ImportRowPayload & {
  tong_ton?: number | null;
};

export const MAX_FILE_MB = 5;
