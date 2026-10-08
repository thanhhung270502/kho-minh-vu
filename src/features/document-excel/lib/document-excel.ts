// File thuần (bẫy 9): cột của 3 mẫu Excel chứng từ, đọc ô ngày/số, gom dòng thành
// phiếu. Route handler, bộ dựng file mẫu và file *.test.ts cùng import.

/** Loại chứng từ nhập từ Excel — đoạn URL `/api/chung-tu-excel/<loai>` (tiếng Việt). */
export const DOCUMENT_KINDS = ["don-dat", "hoa-don", "phieu-nhap"] as const;
export type DocumentKind = (typeof DOCUMENT_KINDS)[number];

/** "moi" = nhập mới; "cap_nhat" = sửa phiếu còn nháp — giá trị gửi RPC, giữ tiếng Việt. */
export type ImportMode = "moi" | "cap_nhat";

export const KIND_LABELS: Record<DocumentKind, { one: string; file: string; rpc: string }> = {
  "don-dat": { one: "đơn đặt", file: "don-dat", rpc: "DON_DAT" },
  "hoa-don": { one: "hóa đơn", file: "hoa-don", rpc: "HOA_DON" },
  "phieu-nhap": { one: "phiếu nhập", file: "phieu-nhap", rpc: "PHIEU_NHAP" },
};

export function isDocumentKind(value: string): value is DocumentKind {
  return (DOCUMENT_KINDS as readonly string[]).includes(value);
}

/** Trường đọc được từ file — khóa nội bộ, không phải tên cột Excel. */
export type FieldKey =
  | "orderNo"
  | "docNo"
  | "date"
  | "dueDate"
  | "recipientKind"
  | "partnerCode"
  | "partnerName"
  | "staff"
  | "source"
  | "warehouse"
  | "note"
  | "productCode"
  | "quantity"
  | "lineNote"
  | "negativeReason"
  | "receiver"
  | "approver"
  | "createdBy"
  | "totalQuantity"
  | "itemCount"
  | "status";

export type ColumnSpec = {
  key: FieldKey;
  title: string;
  width: number;
  /** Bắt buộc khi nhập mới (đánh dấu * trên tiêu đề). */
  required?: boolean;
  /** Chỉ đọc khi nhập (file KiotViet còn cột này), không ghi ra file mẫu / file xuất. */
  readOnly?: boolean;
  /** Chỉ để xem: ghi ra file cập nhật / file xuất, không có trong mẫu nhập mới, không đọc khi nhập. */
  infoOnly?: boolean;
  /** Tên cột đã chuẩn hóa (bỏ dấu, gạch dưới) mà bộ đọc nhận — tiền tố khớp là đủ. */
  match: string[];
  hint: string;
};

const NO_HINT = "Các dòng cùng số được gom thành một phiếu. Thông tin đầu phiếu lấy ở dòng đầu tiên.";

// Đơn đặt / hóa đơn theo cách làm đơn trên web (08/10/2026): người nhận là đối tác mã NB…,
// tên người nhận thật gõ ở Ghi chú, có ghi chú từng dòng, không còn nhân viên nhận.
const NB_HINT = "Mã đối tác nội bộ (NB001, NB002…). Nhập mới để trống = NB001.";
const NOTE_HINT = "Tên người nhận và ghi chú đơn.";
const LINE_NOTE: ColumnSpec = { key: "lineNote", title: "Ghi chú dòng", width: 24, match: ["ghi_chu_dong"], hint: "Ghi chú từng dòng hàng. Khác ghi chú thì tách dòng." };
/** File cũ còn cột Nhân viên nhận vẫn đọc được; mẫu mới không ghi cột này. */
const STAFF_LEGACY: ColumnSpec = { key: "staff", title: "Nhân viên nhận", width: 16, readOnly: true, match: ["nhan_vien_nhan"], hint: "Không cần — người nhận ghi ở Ghi chú." };

export const KIND_COLUMNS: Record<DocumentKind, ColumnSpec[]> = {
  "don-dat": [
    { key: "docNo", title: "Mã đặt hàng", width: 14, required: true, match: ["ma_dat_hang", "so_don"], hint: NO_HINT },
    { key: "date", title: "Ngày", width: 12, required: true, match: ["ngay_dat", "ngay"], hint: "Ngày đặt — dd/mm/yyyy." },
    { key: "dueDate", title: "Ngày giao dự kiến", width: 16, match: ["ngay_giao"], hint: "Không bắt buộc." },
    { key: "recipientKind", title: "Loại người nhận", width: 14, readOnly: true, match: ["loai_nguoi_nhan"], hint: "Không cần — có Mã khách hàng là đơn cho đối tác, không có là đơn cho nhân viên." },
    { key: "partnerCode", title: "Mã khách hàng", width: 14, match: ["ma_khach_hang", "ma_doi_tac"], hint: NB_HINT },
    { key: "partnerName", title: "Tên khách hàng", width: 28, match: ["ten_khach_hang"], hint: "Chỉ để đọc — hệ thống tra theo Mã khách hàng." },
    STAFF_LEGACY,
    { key: "note", title: "Ghi chú", width: 24, match: ["ghi_chu_don", "ghi_chu"], hint: NOTE_HINT },
    { key: "productCode", title: "Mã hàng", width: 18, required: true, match: ["ma_hang"], hint: "Mã hàng trên hệ thống." },
    { key: "quantity", title: "Số lượng", width: 10, required: true, match: ["so_luong"], hint: "Lớn hơn 0." },
    LINE_NOTE,
  ],
  // Theo mẫu "DanhSachChiTietHoaDon Đã process" (08/10/2026). Kho, Tên khách hàng, Lý do
  // xuất âm, Nhân viên nhận không còn trong mẫu nhưng file cũ có cột đó vẫn đọc được.
  "hoa-don": [
    { key: "orderNo", title: "Mã đặt hàng", width: 14, match: ["ma_dat_hang"], hint: "Có đơn đặt trên hệ thống thì hóa đơn gắn vào đơn đó." },
    { key: "docNo", title: "Mã hóa đơn", width: 14, required: true, match: ["ma_hoa_don", "so_hoa_don"], hint: NO_HINT },
    { key: "date", title: "Ngày", width: 12, required: true, match: ["ngay"], hint: "dd/mm/yyyy." },
    { key: "partnerCode", title: "Mã khách hàng", width: 14, match: ["ma_khach_hang", "ma_doi_tac"], hint: `${NB_HINT} Có Mã đặt hàng thì lấy theo đơn đặt.` },
    { key: "approver", title: "Người duyệt đơn", width: 20, match: ["nguoi_duyet_don", "nguoi_ban"], hint: "Họ tên người duyệt đơn. Trống: nhập mới không ghi, cập nhật giữ nguyên." },
    { key: "createdBy", title: "Người tạo", width: 18, infoOnly: true, match: ["nguoi_tao"], hint: "Chỉ để xem — nhập lại không đổi." },
    { key: "note", title: "Ghi chú", width: 24, match: ["ghi_chu_don", "ghi_chu_hoa_don", "ghi_chu"], hint: NOTE_HINT },
    { key: "status", title: "Trạng thái", width: 14, infoOnly: true, match: ["trang_thai"], hint: "Chỉ để xem — ghi sổ / hủy phiếu làm trên web." },
    { key: "productCode", title: "Mã hàng", width: 18, required: true, match: ["ma_hang"], hint: "Mã hàng trên hệ thống." },
    LINE_NOTE,
    { key: "quantity", title: "Số lượng", width: 10, required: true, match: ["so_luong"], hint: "Lớn hơn 0." },
    { key: "partnerName", title: "Tên khách hàng", width: 28, readOnly: true, match: ["ten_khach_hang"], hint: "" },
    STAFF_LEGACY,
    { key: "warehouse", title: "Kho", width: 10, readOnly: true, match: ["kho"], hint: "Trống: mỗi mã lấy kho mặc định của mã đó." },
    { key: "negativeReason", title: "Lý do xuất âm", width: 22, readOnly: true, match: ["ly_do_xuat_am"], hint: "" },
  ],
  // Theo mẫu "DanhSachChiTietNhapHang đã process" (08/10/2026). Nguồn nhập, Kho, Ghi chú dòng
  // không còn trong mẫu nhưng file cũ có cột đó vẫn đọc được.
  "phieu-nhap": [
    { key: "docNo", title: "Mã nhập hàng", width: 14, required: true, match: ["ma_nhap_hang", "ma_phieu_nhap", "so_phieu"], hint: NO_HINT },
    { key: "date", title: "Ngày nhập", width: 12, required: true, match: ["ngay_nhap", "ngay"], hint: "dd/mm/yyyy." },
    { key: "partnerCode", title: "Mã nhà cung cấp", width: 16, match: ["ma_nha_cung_cap", "ma_ncc"], hint: "Mã nhà cung cấp trên hệ thống. Nhập mới để trống = NCC000001 (Vũ Trụ)." },
    { key: "receiver", title: "Người nhập", width: 18, match: ["nguoi_nhap"], hint: "Người nhận hàng vào kho. Trống: nhập mới không ghi, cập nhật giữ nguyên." },
    { key: "createdBy", title: "Người tạo", width: 18, infoOnly: true, match: ["nguoi_tao"], hint: "Chỉ để xem — nhập lại không đổi." },
    { key: "note", title: "Ghi chú", width: 24, match: ["ghi_chu_phieu", "ghi_chu"], hint: "Ghi chú đầu phiếu." },
    { key: "totalQuantity", title: "Tổng số lượng", width: 14, infoOnly: true, match: ["tong_so_luong"], hint: "Chỉ để xem — tổng số lượng của cả phiếu." },
    { key: "itemCount", title: "Tổng số mặt hàng", width: 16, infoOnly: true, match: ["tong_so_mat_hang"], hint: "Chỉ để xem — số dòng hàng của phiếu." },
    { key: "status", title: "Trạng thái", width: 14, infoOnly: true, match: ["trang_thai"], hint: "Chỉ để xem — ghi sổ / hủy phiếu làm trên web." },
    { key: "productCode", title: "Mã hàng", width: 18, required: true, match: ["ma_hang"], hint: "Mã hàng trên hệ thống." },
    { key: "quantity", title: "Số lượng", width: 10, required: true, match: ["so_luong"], hint: "Lớn hơn 0." },
    { key: "source", title: "Nguồn nhập", width: 12, readOnly: true, match: ["nguon_nhap"], hint: "" },
    { key: "warehouse", title: "Kho", width: 10, readOnly: true, match: ["kho"], hint: "" },
    { key: "lineNote", title: "Ghi chú dòng", width: 24, readOnly: true, match: ["ghi_chu_dong"], hint: "" },
  ],
};

/**
 * Tìm cột cho từng trường trong tiêu đề đã chuẩn hóa. So khớp chính xác trước, rồi
 * tiền tố — "kho_khong_can_de_kho_nao…" vẫn là cột Kho, "so_luong" không ăn nhầm
 * "tong_so_luong". Mỗi cột chỉ gán cho một trường.
 */
export function mapHeaders(kind: DocumentKind, headers: readonly string[]): Partial<Record<FieldKey, string>> {
  const used = new Set<string>();
  const out: Partial<Record<FieldKey, string>> = {};
  for (const pass of ["exact", "prefix"] as const) {
    for (const col of KIND_COLUMNS[kind]) {
      if (out[col.key]) continue;
      for (const m of col.match) {
        const hit = headers.find(
          (h) => !used.has(h) && (pass === "exact" ? h === m : h.startsWith(m + "_")),
        );
        if (hit) {
          out[col.key] = hit;
          used.add(hit);
          break;
        }
      }
    }
  }
  return out;
}

const pad = (n: number) => String(n).padStart(2, "0");

/** Excel đếm ngày từ 30/12/1899 (gồm cả ngày 29/02/1900 không có thật). */
function fromExcelSerial(serial: number): string | null {
  if (!Number.isFinite(serial) || serial < 1 || serial > 2_958_465) return null;
  const ms = Math.round((serial - 25569) * 86_400_000);
  return new Date(ms).toISOString().slice(0, 10);
}

/** Ô ngày → "yyyy-mm-dd". Nhận Date của exceljs, số serial, dd/mm/yyyy, yyyy-mm-dd. null = trống/sai. */
export function parseDateCell(value: unknown): string | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10);
  if (typeof value === "number") return fromExcelSerial(value);
  const text = String(value).trim();
  const vn = /^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})(?:\s.*)?$/.exec(text);
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[T\s].*)?$/.exec(text);
  let y: number, m: number, d: number;
  if (vn) [d, m, y] = [Number(vn[1]), Number(vn[2]), Number(vn[3])];
  else if (iso) [y, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (/^\d+(\.\d+)?$/.test(text)) return fromExcelSerial(Number(text));
  else return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return `${y}-${pad(m)}-${pad(d)}`;
}

/** "1.200" = nghìn hai trăm (dấu chấm phân nghìn kiểu Việt); "1,5" = một phẩy năm. */
export function parseQuantityCell(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  let text = String(value).trim().replace(/\s/g, "");
  if (/^\d{1,3}(\.\d{3})+$/.test(text)) text = text.replace(/\./g, "");
  text = text.replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(text)) return null;
  return Number(text);
}

const plain = (s: string) =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().trim();

/** "Đối tác" / "Nội bộ" → giá trị RPC; trống hoặc lạ → null (để RPC tự suy). */
export function parseRecipientKind(text: string): "DOI_TAC" | "NOI_BO" | null {
  const t = plain(text);
  if (t === "") return null;
  if (t.startsWith("noi bo") || t === "nb") return "NOI_BO";
  if (t.startsWith("doi tac") || t.startsWith("khach")) return "DOI_TAC";
  return null;
}

export function parseSource(text: string): "NCC" | "NHA_MAY" | null {
  const t = plain(text);
  if (t === "") return null;
  if (t.startsWith("nha may") || t === "nha_may") return "NHA_MAY";
  return "NCC";
}

/** Mã hoặc nhãn lý do xuất âm → mã; chữ tự do → KHAC + giữ nguyên văn ở ghi chú lý do. */
export function parseNegativeReason(
  text: string,
  labels: Record<string, string>,
): { code: string | null; note: string | null } {
  const raw = text.trim();
  if (raw === "") return { code: null, note: null };
  const t = plain(raw);
  for (const [code, label] of Object.entries(labels)) {
    if (plain(code) === t || plain(label) === t) return { code, note: null };
  }
  return { code: "KHAC", note: raw };
}

/** "NGỌC - QUỲNH", "Ngọc, Thảo" → ["NGỌC", "QUỲNH"]. */
export function splitStaffNames(text: string): string[] {
  return text
    .split(/\s*[-,;/]\s*/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Một dòng Excel đã đọc ô (chuỗi đã trim, ngày/số đã parse). */
export type DocumentFileRow = {
  row: number;
  docNo: string;
  orderNo: string;
  date: string | null;
  dateRaw: string;
  dueDate: string | null;
  recipientKind: string;
  partnerCode: string;
  staff: string;
  source: string;
  warehouse: string;
  note: string;
  productCode: string;
  quantity: number | null;
  quantityRaw: string;
  lineNote: string;
  negativeReason: string;
  receiver: string;
  /** Người duyệt đơn của hóa đơn — RPC ghép thành đoạn "Người bán: X" của ghi chú (0122). */
  approver: string;
};

export type RowIssue = { row: number; docNo: string; message: string };

export type RpcLine = {
  dong: number;
  ma_hang: string | null;
  so_luong: number | null;
  ghi_chu: string | null;
  nhan_vien: string | null;
};

/** Hợp đồng jsonb với RPC nhap_chung_tu_excel — khóa snake_case có chủ đích. */
export type RpcDocument = {
  so: string;
  /** Số dòng Excel đầu tiên của phiếu — để báo lỗi đúng dòng. */
  dong_dau: number;
  ngay: string | null;
  ngay_giao: string | null;
  loai_nhan: "DOI_TAC" | "NOI_BO" | null;
  ma_doi_tac: string | null;
  nguon: "NCC" | "NHA_MAY" | null;
  ma_kho: string | null;
  ma_dat_hang: string | null;
  ghi_chu: string | null;
  ly_do_xuat_am: string | null;
  ghi_chu_ly_do: string | null;
  /** Người nhập của phiếu nhập — RPC ghép thành đoạn "Người nhập: X" của ghi chú. */
  nguoi_nhap: string | null;
  /** Người duyệt đơn của hóa đơn — đoạn "Người bán: X" của ghi chú (0122). */
  nguoi_ban: string | null;
  nhan_vien: string[];
  dong: RpcLine[];
};

const orNull = (s: string) => (s.trim() === "" ? null : s.trim());

/**
 * Gom dòng thành phiếu theo số phiếu (giữ thứ tự xuất hiện). Lỗi đọc ô (ngày sai,
 * số lượng không phải số, thiếu số phiếu) trả riêng — RPC chỉ kiểm phần cần tra
 * database. Phiếu cập nhật mà mọi dòng trống Mã hàng = chỉ sửa đầu phiếu.
 */
export function groupDocuments(
  rows: readonly DocumentFileRow[],
  reasonLabels: Record<string, string>,
): { documents: RpcDocument[]; issues: RowIssue[] } {
  const issues: RowIssue[] = [];
  const byNo = new Map<string, RpcDocument>();

  for (const r of rows) {
    if (r.docNo === "") {
      issues.push({ row: r.row, docNo: "", message: "Thiếu số phiếu" });
      continue;
    }
    if (r.dateRaw !== "" && r.date === null) {
      issues.push({ row: r.row, docNo: r.docNo, message: `Ngày "${r.dateRaw}" không đọc được — ghi dạng dd/mm/yyyy` });
    }
    if (r.quantityRaw !== "" && r.quantity === null) {
      issues.push({ row: r.row, docNo: r.docNo, message: `Số lượng "${r.quantityRaw}" không phải là số` });
    }

    let doc = byNo.get(r.docNo);
    if (!doc) {
      const reason = parseNegativeReason(r.negativeReason, reasonLabels);
      const staff = splitStaffNames(r.staff);
      doc = {
        so: r.docNo,
        dong_dau: r.row,
        ngay: r.date,
        ngay_giao: r.dueDate,
        loai_nhan: parseRecipientKind(r.recipientKind),
        ma_doi_tac: orNull(r.partnerCode),
        nguon: parseSource(r.source),
        ma_kho: orNull(r.warehouse),
        ma_dat_hang: orNull(r.orderNo),
        ghi_chu: orNull(r.note),
        ly_do_xuat_am: reason.code,
        ghi_chu_ly_do: reason.note,
        nguoi_nhap: orNull(r.receiver),
        nguoi_ban: orNull(r.approver),
        nhan_vien: staff,
        dong: [],
      };
      byNo.set(r.docNo, doc);
    } else {
      for (const name of splitStaffNames(r.staff)) {
        if (!doc.nhan_vien.some((n) => n.toUpperCase() === name.toUpperCase())) doc.nhan_vien.push(name);
      }
    }

    const blankLine = r.productCode === "" && r.quantityRaw === "";
    if (!blankLine) {
      doc.dong.push({
        dong: r.row,
        ma_hang: orNull(r.productCode),
        so_luong: r.quantity,
        ghi_chu: orNull(r.lineNote),
        nhan_vien: orNull(r.staff),
      });
    }
  }

  return { documents: [...byNo.values()], issues };
}
