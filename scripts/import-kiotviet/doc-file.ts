/**
 * Đọc file .xlsx của KiotViet mà KHÔNG tin vào định dạng ô.
 *
 * Ba bẫy đã biết của file export KiotViet, đều đã gặp thật:
 *   1. Cột số định dạng Text — exceljs trả string thay vì number
 *   2. Dòng "TỔNG CỘNG" và dòng trống ở cuối sheet
 *   3. Ô rich text và ô công thức — cell.value là object, không phải chuỗi
 */
import ExcelJS from "exceljs";
import { existsSync } from "node:fs";

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

export async function docSheet(duongDan: string): Promise<DongTho[]> {
  if (!existsSync(duongDan)) {
    throw new Error(
      `Không tìm thấy file: ${duongDan}\n` +
        `Cách xử lý: đặt bốn file export KiotViet vào thư mục data/kiotviet/.\n` +
        `Xem data/kiotviet/README.md để biết tên file cần đặt.`,
    );
  }

  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(duongDan);
  const ws = wb.worksheets[0];
  if (!ws) throw new Error(`File ${duongDan} không có sheet nào.`);

  const tenCot: string[] = [];
  ws.getRow(1).eachCell({ includeEmpty: true }, (cell, i) => {
    tenCot[i] = chuanHoaTenCot(doChuoi(cell.value) ?? `cot_${i}`);
  });

  const ketQua: DongTho[] = [];

  ws.eachRow({ includeEmpty: false }, (row, soDong) => {
    if (soDong === 1) return;

    const o: Record<string, unknown> = {};
    let rong = true;
    row.eachCell({ includeEmpty: true }, (cell, i) => {
      const khoa = tenCot[i];
      if (!khoa) return;
      const gt = cell.value;
      o[khoa] = gt;
      if (gt !== null && gt !== undefined && gt !== "") rong = false;
    });

    if (rong) return;

    // Bỏ dòng tổng ở cuối sheet.
    const oDau = chuanHoa(doChuoi(Object.values(o)[0]) ?? "").toLowerCase();
    if (TU_KHOA_DONG_TONG.some((k) => oDau === k || oDau.startsWith(k + " "))) return;

    ketQua.push({ soDong, o });
  });

  return ketQua;
}
