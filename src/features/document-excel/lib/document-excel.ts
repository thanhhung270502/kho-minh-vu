// File thuần (bẫy 9): cột của 3 mẫu Excel chứng từ, đọc ô ngày/số, gom dòng thành
// phiếu. Route handler, bộ dựng file mẫu và scripts/test-pure-functions.ts cùng import.

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
  | "negativeReason";

export type ColumnSpec = {
  key: FieldKey;
  title: string;
  width: number;
  /** Bắt buộc khi nhập mới (đánh dấu * trên tiêu đề). */
  required?: boolean;
  /** Chỉ đọc khi nhập (file KiotViet còn cột này), không ghi ra file mẫu / file xuất. */
  readOnly?: boolean;
  /** Tên cột đã chuẩn hóa (bỏ dấu, gạch dưới) mà bộ đọc nhận — tiền tố khớp là đủ. */
  match: string[];
  hint: string;
};

const NO_HINT = "Các dòng cùng số được gom thành một phiếu. Thông tin đầu phiếu lấy ở dòng đầu tiên.";

export const KIND_COLUMNS: Record<DocumentKind, ColumnSpec[]> = {
  "don-dat": [
    { key: "docNo", title: "Mã đặt hàng", width: 14, required: true, match: ["ma_dat_hang", "so_don"], hint: NO_HINT },
    { key: "date", title: "Ngày", width: 12, required: true, match: ["ngay_dat", "ngay"], hint: "Ngày đặt — dd/mm/yyyy." },
    { key: "dueDate", title: "Ngày giao dự kiến", width: 16, match: ["ngay_giao"], hint: "Không bắt buộc." },
    { key: "recipientKind", title: "Loại người nhận", width: 14, readOnly: true, match: ["loai_nguoi_nhan"], hint: "Không cần — có Mã khách hàng là đơn cho đối tác, không có là đơn cho nhân viên." },
    { key: "partnerCode", title: "Mã khách hàng", width: 14, match: ["ma_khach_hang", "ma_doi_tac"], hint: "Mã đối tác trên hệ thống (vd. NB001)." },
    { key: "partnerName", title: "Tên khách hàng", width: 28, match: ["ten_khach_hang"], hint: "Chỉ để đọc — hệ thống tra theo Mã khách hàng." },
    { key: "staff", title: "Nhân viên nhận", width: 16, match: ["nhan_vien_nhan"], hint: "Tên viết tắt nhân viên (vd. NGỌC). Nhiều người: NGỌC - QUỲNH." },
    { key: "note", title: "Ghi chú", width: 24, match: ["ghi_chu"], hint: "Ghi chú đơn." },
    { key: "productCode", title: "Mã hàng", width: 18, required: true, match: ["ma_hang"], hint: "Mã hàng trên hệ thống." },
    { key: "quantity", title: "Số lượng", width: 10, required: true, match: ["so_luong"], hint: "Lớn hơn 0." },
  ],
  "hoa-don": [
    { key: "orderNo", title: "Mã đặt hàng", width: 14, match: ["ma_dat_hang"], hint: "Có đơn đặt trên hệ thống thì hóa đơn gắn vào đơn đó." },
    { key: "docNo", title: "Mã hóa đơn", width: 14, required: true, match: ["ma_hoa_don", "so_hoa_don"], hint: NO_HINT },
    { key: "date", title: "Ngày", width: 12, required: true, match: ["ngay"], hint: "dd/mm/yyyy." },
    { key: "recipientKind", title: "Loại người nhận", width: 14, readOnly: true, match: ["loai_nguoi_nhan"], hint: "Không cần — có Mã khách hàng là đơn cho đối tác, không có là đơn cho nhân viên." },
    { key: "partnerCode", title: "Mã khách hàng", width: 14, match: ["ma_khach_hang", "ma_doi_tac"], hint: "Mã đối tác trên hệ thống (vd. NB001)." },
    { key: "partnerName", title: "Tên khách hàng", width: 28, match: ["ten_khach_hang"], hint: "Chỉ để đọc — hệ thống tra theo Mã khách hàng." },
    { key: "staff", title: "Nhân viên nhận", width: 16, match: ["nhan_vien_nhan"], hint: "Tên viết tắt nhân viên (vd. NGỌC). Nhiều người: NGỌC - QUỲNH." },
    { key: "warehouse", title: "Kho", width: 10, match: ["kho"], hint: "Để trống: mỗi mã lấy kho mặc định của mã đó." },
    { key: "note", title: "Ghi chú", width: 24, match: ["ghi_chu"], hint: "Ghi chú hóa đơn." },
    { key: "productCode", title: "Mã hàng", width: 18, required: true, match: ["ma_hang"], hint: "Mã hàng trên hệ thống." },
    { key: "quantity", title: "Số lượng", width: 10, required: true, match: ["so_luong"], hint: "Lớn hơn 0." },
    { key: "negativeReason", title: "Lý do xuất âm", width: 22, match: ["ly_do_xuat_am"], hint: "Không bắt buộc — chọn lại được lúc ghi sổ." },
  ],
  "phieu-nhap": [
    { key: "docNo", title: "Mã nhập hàng", width: 14, required: true, match: ["ma_nhap_hang", "ma_phieu_nhap", "so_phieu"], hint: NO_HINT },
    { key: "date", title: "Ngày nhập", width: 12, required: true, match: ["ngay_nhap", "ngay"], hint: "dd/mm/yyyy." },
    { key: "source", title: "Nguồn nhập", width: 12, match: ["nguon_nhap"], hint: "NCC hoặc Nhà máy. Trống = NCC." },
    { key: "partnerCode", title: "Mã NCC", width: 14, required: true, match: ["ma_ncc", "ma_nha_cung_cap"], hint: "Mã nhà cung cấp trên hệ thống." },
    { key: "warehouse", title: "Kho", width: 10, match: ["kho"], hint: "K1, K2 hoặc tên kho. Trống: kho mặc định của mã đầu tiên." },
    { key: "note", title: "Ghi chú phiếu", width: 24, match: ["ghi_chu_phieu"], hint: "Ghi chú đầu phiếu." },
    { key: "productCode", title: "Mã hàng", width: 18, required: true, match: ["ma_hang"], hint: "Mã hàng trên hệ thống." },
    { key: "quantity", title: "Số lượng", width: 10, required: true, match: ["so_luong"], hint: "Lớn hơn 0." },
    { key: "lineNote", title: "Ghi chú dòng", width: 24, match: ["ghi_chu_dong"], hint: "Ghi chú từng dòng hàng." },
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
