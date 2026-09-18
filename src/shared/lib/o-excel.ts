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

import { chuanHoa } from "./tach-dvt-cong-doan";

export type DongTho = {
  /** Số dòng THẬT trong file, tính cả header — để người dùng mở Excel xem đúng chỗ. */
  soDong: number;
  o: Record<string, unknown>;
};

/** Nhận cả string lẫn number. KHÔNG tin `typeof v === "number"`. */
export function doSo(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;

  const s = doChuoi(v);
  if (!s) return null;

  // Bỏ phân cách nghìn kiểu Việt Nam: 1.234.567,89 và 1,234,567.89
  let t = s.replace(/\s/g, "");
  const phay = t.lastIndexOf(",");
  const cham = t.lastIndexOf(".");
  if (phay > cham) {
    t = t.replace(/\./g, "").replace(",", ".");
  } else {
    t = t.replace(/,/g, "");
  }

  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/** Xử lý cả rich text lẫn công thức, trả text phẳng đã trim. */
export function doChuoi(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  if (typeof v === "string") return v.trim() || null;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  if (v instanceof Date) return v.toISOString();

  if (typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (Array.isArray(o.richText)) {
      return (o.richText as Array<{ text?: string }>)
        .map((p) => p.text ?? "")
        .join("")
        .trim() || null;
    }
    if ("result" in o) return doChuoi(o.result);
    if ("text" in o) return doChuoi(o.text);
    if ("hyperlink" in o) return doChuoi(o.text ?? o.hyperlink);
  }
  return String(v).trim() || null;
}

/** Bỏ dấu, lowercase, gạch dưới — để code không phụ thuộc KiotViet viết hoa thường. */
function chuanHoaTenCot(ten: string): string {
  return chuanHoa(ten).toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

const TU_KHOA_DONG_TONG = ["tong", "tong cong", "cong", "total"];

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
export async function docSheetDau(
  nguon: string | Buffer,
): Promise<{ tenCot: string[]; tenCotGoc: string[]; dong: DongTho[] }> {
  const reader = new ExcelJS.stream.xlsx.WorkbookReader(
    typeof nguon === "string" ? nguon : Readable.from(nguon),
    {
      sharedStrings: "cache",
      hyperlinks: "ignore",
      styles: "ignore",
      worksheets: "emit",
    },
  );

  let tenCotGoc: string[] = [];
  let tenCotChuan: string[] = [];

  const ketQua: DongTho[] = [];

  for await (const ws of reader) {
    let tenCot: string[] = [];
    let soDong = 0;

    for await (const row of ws) {
      soDong++;
      const values = (row.values as unknown[]) ?? [];

      if (soDong === 1) {
        tenCotGoc = values.map((v, i) => (i === 0 ? "" : (doChuoi(v) ?? `cot_${i}`)));
        tenCot = values.map((v, i) => (i === 0 ? "" : chuanHoaTenCot(doChuoi(v) ?? `cot_${i}`)));
        tenCotChuan = tenCot.filter(Boolean);
        continue;
      }

      const o: Record<string, unknown> = {};
      let rong = true;
      values.forEach((gt, i) => {
        const khoa = tenCot[i];
        if (!khoa) return;
        o[khoa] = gt;
        if (gt !== null && gt !== undefined && gt !== "") rong = false;
      });

      if (rong) continue;

      const oDau = chuanHoa(doChuoi(Object.values(o)[0]) ?? "").toLowerCase();
      if (TU_KHOA_DONG_TONG.some((k) => oDau === k || oDau.startsWith(k + " "))) continue;

      ketQua.push({ soDong: row.number ?? soDong, o });
    }

    break; // chỉ đọc sheet đầu tiên
  }

  return { tenCot: tenCotChuan, tenCotGoc, dong: ketQua };
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
export function doNgayExcel(v: unknown): string | null {
  const n = doSo(v);
  if (n === null || n < 1) return doChuoi(v);

  // Đọc sê-ri như thể là UTC để lấy đúng các thành phần giờ treo tường,
  // rồi gắn offset +07:00 thay vì Z.
  const ms = Math.round((n - 25569) * 86400 * 1000);
  const d = new Date(ms);
  if (Number.isNaN(d.getTime())) return doChuoi(v);

  const p2 = (x: number) => String(x).padStart(2, "0");
  return (
    `${d.getUTCFullYear()}-${p2(d.getUTCMonth() + 1)}-${p2(d.getUTCDate())}` +
    `T${p2(d.getUTCHours())}:${p2(d.getUTCMinutes())}:${p2(d.getUTCSeconds())}+07:00`
  );
}
