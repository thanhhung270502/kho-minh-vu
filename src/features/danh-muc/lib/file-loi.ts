import { nhanCot } from "./mau-excel";

export type DongLoiCsv = { dong: number; cot: string; thong_bao: string };

function oCsv(v: string | number): string {
  const s = String(v);
  // Chỉ bọc nháy khi cần, và nhân đôi nháy bên trong — quy tắc RFC 4180.
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Danh sách lỗi dạng CSV để mở bằng Excel.
 *
 * Dùng CSV chứ không .xlsx: exceljs bản cho trình duyệt nặng và không có tùy
 * chọn bỏ qua styles. BOM (`\uFEFF`) ở đầu là bắt buộc — thiếu nó Excel trên
 * Windows đọc UTF-8 thành ANSI và tiếng Việt thành ký tự rác.
 */
export function taoCsvLoi(loi: DongLoiCsv[]): Blob {
  const dong = [
    ["Dòng", "Cột", "Lỗi"],
    ...loi.map((l) => [l.dong, nhanCot(l.cot), l.thong_bao]),
  ];

  const noiDung = "\uFEFF" + dong.map((d) => d.map(oCsv).join(",")).join("\r\n");

  return new Blob([noiDung], { type: "text/csv;charset=utf-8" });
}

export function tenFileLoi(tenGoc: string): string {
  return `${tenGoc.replace(/\.xlsx$/i, "")}-loi.csv`;
}
