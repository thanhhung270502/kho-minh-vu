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
  | "gia_ban"
  | "dang_kinh_doanh"
  | "barcode"
  | "ghi_chu"
  | "tong_ton"
  | "gia_von";

export type TemplateColumn = {
  key: ColumnKey;
  title: string;
  width: number;
  /** Cột chỉ để xem khi xuất; nhập vào bị bỏ qua. */
  exportOnly?: boolean;
};

export const TEMPLATE_COLUMNS: readonly TemplateColumn[] = [
  { key: "ma_hang", title: "Mã hàng", width: 22 },
  { key: "ten_hang", title: "Tên hàng", width: 48 },
  { key: "nhom_hang", title: "Nhóm hàng", width: 28 },
  { key: "dvt", title: "Đơn vị tính", width: 14 },
  { key: "cong_doan", title: "Công đoạn", width: 14 },
  { key: "quy_doi", title: "Quy đổi", width: 10 },
  { key: "kho_mac_dinh", title: "Kho mặc định", width: 14 },
  { key: "ton_toi_thieu", title: "Tồn tối thiểu", width: 14 },
  { key: "ton_toi_da", title: "Tồn tối đa", width: 12 },
  { key: "gia_ban", title: "Giá bán", width: 14 },
  { key: "dang_kinh_doanh", title: "Đang kinh doanh", width: 16 },
  { key: "barcode", title: "Barcode", width: 16 },
  { key: "ghi_chu", title: "Ghi chú", width: 30 },
  { key: "tong_ton", title: "Tồn hiện tại", width: 13, exportOnly: true },
  { key: "gia_von", title: "Giá vốn", width: 14, exportOnly: true },
];

export const COLUMN_LABELS: Record<string, string> = Object.fromEntries(
  TEMPLATE_COLUMNS.map((column) => [column.key, column.title]),
);

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
  gia_ban?: number | null;
  dang_kinh_doanh?: boolean | null;
  barcode?: string | null;
  ghi_chu?: string | null;
};

/** Một dòng để ghi ra file mẫu hệ mới. */
export type ExportRowPayload = ImportRowPayload & {
  tong_ton?: number | null;
  gia_von?: number | null;
};

export const MAX_FILE_MB = 5;
