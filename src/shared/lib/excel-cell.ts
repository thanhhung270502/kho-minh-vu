/**
 * Đọc file .xlsx mà KHÔNG tin vào định dạng ô.
 *
 * SERVER/NODE ONLY — dùng `node:stream`. Không import vào Client Component.
 *
 * Ba bẫy đã biết của file export KiotViet, đều đã gặp thật:
 *   1. Cột số định dạng Text — exceljs trả string thay vì number
 *   2. Dòng "TỔNG CỘNG" và dòng trống ở cuối sheet
 *   3. Ô rich text và ô công thức — cell.value là object, không phải chuỗi
 */
import ExcelJS from "exceljs";
import { Readable } from "node:stream";

import { normalizeCode } from "./parse-unit-stage";

export type RawRow = {
  /** Số dòng THẬT trong file, tính cả header — để người dùng mở Excel xem đúng chỗ. */
  rowNumber: number;
  cells: Record<string, unknown>;
};

/** Nhận cả string lẫn number. KHÔNG tin `typeof v === "number"`. */
export function readNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;

  const text = readString(value);
  if (!text) return null;

  // Bỏ phân cách nghìn kiểu Việt Nam: 1.234.567,89 và 1,234,567.89
  let normalized = text.replace(/\s/g, "");
  const lastComma = normalized.lastIndexOf(",");
  const lastDot = normalized.lastIndexOf(".");
  if (lastComma > lastDot) {
    normalized = normalized.replace(/\./g, "").replace(",", ".");
  } else {
    normalized = normalized.replace(/,/g, "");
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

/** Xử lý cả rich text lẫn công thức, trả text phẳng đã trim. */
export function readString(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "string") return value.trim() || null;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();

  if (typeof value === "object") {
    const object = value as Record<string, unknown>;
    if (Array.isArray(object.richText)) {
      return (
        (object.richText as Array<{ text?: string }>)
          .map((part) => part.text ?? "")
          .join("")
          .trim() || null
      );
    }
    if ("result" in object) return readString(object.result);
    if ("text" in object) return readString(object.text);
    if ("hyperlink" in object) return readString(object.text ?? object.hyperlink);
  }
  return String(value).trim() || null;
}

/** Bỏ dấu, lowercase, gạch dưới — để code không phụ thuộc KiotViet viết hoa thường. */
function normalizeHeader(header: string): string {
  return normalizeCode(header)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "");
}

const TOTAL_ROW_KEYWORDS = ["tong", "tong cong", "cong", "total"];

/**
 * Đọc sheet đầu tiên. Nhận đường dẫn (script nạp dữ liệu) hoặc Buffer (Route Handler
 * nhận file người dùng tải lên).
 *
 * BẮT BUỘC dùng reader dạng STREAM với `styles: "ignore"`. Reader thường
 * (`workbook.xlsx.readFile` / `.load`) CRASH trên file export KiotViet:
 *   TypeError: Cannot read properties of undefined (reading 'styles')
 * vì phần styles.xml lệch chuẩn. Đây cũng là lý do KHÔNG đọc Excel ở trình duyệt:
 * bản exceljs cho browser chỉ có `.load()`, không có tùy chọn bỏ qua styles.
 */
export type ParsedSheet = {
  headers: string[];
  rawHeaders: string[];
  rows: RawRow[];
};

/** Gom mảng ô thô của một dòng thành object theo tên cột đã chuẩn hóa. */
function buildRow(
  values: unknown[],
  headers: string[],
  rowNumber: number,
): RawRow | null {
  const cells: Record<string, unknown> = {};
  let empty = true;

  values.forEach((value, index) => {
    const key = headers[index];
    if (!key) return;
    cells[key] = value;
    if (value !== null && value !== undefined && value !== "") empty = false;
  });

  if (empty) return null;

  const firstCell = normalizeCode(readString(Object.values(cells)[0]) ?? "").toLowerCase();
  if (
    TOTAL_ROW_KEYWORDS.some(
      (keyword) => firstCell === keyword || firstCell.startsWith(keyword + " "),
    )
  ) {
    return null;
  }

  return { rowNumber, cells };
}

/**
 * Đường dự phòng: đọc cả workbook vào bộ nhớ.
 *
 * Reader dạng stream của exceljs giả định các mục trong file zip đến theo đúng
 * thứ tự (workbook.xml trước worksheets). File do CHÍNH exceljs ghi ra lại
 * không luôn theo thứ tự đó — tùy kích thước, worksheet đến trước và reader ném
 * "Cannot read properties of undefined (reading 'sheets')". Đo được: 50 dòng
 * đọc ổn, 100–1200 dòng hỏng, 1600 dòng lại ổn.
 *
 * Reader thường không kén thứ tự nhưng lại chết trên styles lệch chuẩn của
 * KiotViet — nên dùng nó làm ĐƯỜNG DỰ PHÒNG kèm `ignoreNodes: ["styles"]`,
 * chứ không thay thế.
 */
async function readViaWorkbook(source: string | Buffer): Promise<ParsedSheet> {
  const workbook = new ExcelJS.Workbook();

  if (typeof source === "string") {
    await workbook.xlsx.readFile(source);
  } else {
    // Kiểu `Buffer` trong .d.ts của exceljs là interface riêng của nó, không
    // phải `Buffer` của Node — cùng một object lúc chạy.
    await workbook.xlsx.load(
      source as unknown as Parameters<typeof workbook.xlsx.load>[0],
      { ignoreNodes: ["styles"] },
    );
  }

  const sheet = workbook.worksheets[0];
  if (!sheet) return { headers: [], rawHeaders: [], rows: [] };

  let headers: string[] = [];
  let rawHeaders: string[] = [];
  const rows: RawRow[] = [];

  sheet.eachRow({ includeEmpty: false }, (row, rowIndex) => {
    const values = (row.values as unknown[]) ?? [];

    if (rowIndex === 1) {
      rawHeaders = values.map((v, i) => (i === 0 ? "" : (readString(v) ?? `cot_${i}`)));
      headers = values.map((v, i) =>
        i === 0 ? "" : normalizeHeader(readString(v) ?? `cot_${i}`),
      );
      return;
    }

    const parsed = buildRow(values, headers, row.number ?? rowIndex);
    if (parsed) rows.push(parsed);
  });

  return { headers: headers.filter(Boolean), rawHeaders, rows };
}

async function readViaStream(source: string | Buffer): Promise<ParsedSheet> {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(
    typeof source === "string" ? source : Readable.from(source),
    {
      sharedStrings: "cache",
      hyperlinks: "ignore",
      styles: "ignore",
      worksheets: "emit",
    },
  );

  let rawHeaders: string[] = [];
  let normalizedHeaders: string[] = [];

  const rows: RawRow[] = [];

  for await (const sheet of reader) {
    let headers: string[] = [];
    let rowIndex = 0;

    for await (const row of sheet) {
      rowIndex++;
      const values = (row.values as unknown[]) ?? [];

      if (rowIndex === 1) {
        rawHeaders = values.map((v, i) => (i === 0 ? "" : (readString(v) ?? `cot_${i}`)));
        headers = values.map((v, i) =>
          i === 0 ? "" : normalizeHeader(readString(v) ?? `cot_${i}`),
        );
        normalizedHeaders = headers.filter(Boolean);
        continue;
      }

      const parsed = buildRow(values, headers, row.number ?? rowIndex);
      if (parsed) rows.push(parsed);
    }

    break; // chỉ đọc sheet đầu tiên
  }

  return { headers: normalizedHeaders, rawHeaders, rows };
}

export async function readFirstSheet(source: string | Buffer): Promise<ParsedSheet> {
  try {
    return await readViaStream(source);
  } catch (streamError) {
    try {
      return await readViaWorkbook(source);
    } catch {
      // Ném lỗi của reader chính: nó sát nguyên nhân thật hơn.
      throw streamError;
    }
  }
}

/**
 * Ngày của KiotViet xuất ra dạng số sê-ri Excel: 46277.65498746528.
 *
 * Số sê-ri Excel KHÔNG có múi giờ — nó là GIỜ TREO TƯỜNG. KiotViet là hệ thống
 * Việt Nam nên đó là giờ ICT (UTC+7). Phiên bản đầu gắn nhãn "Z" (UTC) → lệch
 * 7 tiếng: hóa đơn tạo lúc 15:43 bị ghi thành 15:43 UTC, tức 22:43 giờ VN.
 *
 * Trả chuỗi ISO có offset tường minh +07:00 để không ai phải đoán.
 * Mốc 1899-12-30 (Excel coi 1900 là năm nhuận nên mốc lùi một ngày).
 */
export function readExcelDate(value: unknown): string | null {
  const serial = readNumber(value);
  if (serial === null || serial < 1) return readString(value);

  // Đọc sê-ri như thể là UTC để lấy đúng các thành phần giờ treo tường,
  // rồi gắn offset +07:00 thay vì Z.
  const ms = Math.round((serial - 25569) * 86400 * 1000);
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) return readString(value);

  const pad = (x: number) => String(x).padStart(2, "0");
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}+07:00`
  );
}
