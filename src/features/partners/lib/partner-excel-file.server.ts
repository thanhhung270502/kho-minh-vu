/**
 * Đọc / ghi file Excel đối tác. CHỈ CHẠY Ở SERVER (bẫy 7) — hàng rào thật là
 * `node:stream` bên trong `@/shared/lib/excel-cell`.
 */
import ExcelJS from "exceljs";

import type { ImportIssue as RowIssue } from "@/shared/lib/excel-import";
import { readFirstSheet, readNumber, readString } from "@/shared/lib/excel-cell";

import {
  PARTNER_COLUMNS,
  PARTNER_KIND_EXCEL,
  mapPartnerHeaders,
  parseActiveFlag,
  parsePartnerKind,
  type PartnerField,
  type PartnerRpcRow,
} from "./partner-excel";
import type { PartnerDetail } from "../types";

const MAX_ROWS = 5_000;

export async function readPartnerFile(buf: Buffer): Promise<{ rows: PartnerRpcRow[]; issues: RowIssue[] }> {
  const sheet = await readFirstSheet(buf);
  const map = mapPartnerHeaders(sheet.headers);
  if (!map.code && !map.name) {
    throw new Error("Dòng đầu của file phải có cột “Mã nhà cung cấp” và “Tên nhà cung cấp”. Tải file mẫu đối tác rồi điền vào đó.");
  }
  if (sheet.rows.length > MAX_ROWS) {
    throw new Error(`File có ${sheet.rows.length.toLocaleString("vi-VN")} dòng — tối đa ${MAX_ROWS.toLocaleString("vi-VN")} dòng mỗi lần.`);
  }

  const issues: RowIssue[] = [];
  const cell = (cells: Record<string, unknown>, key: PartnerField): unknown => {
    const col = map[key];
    return col ? cells[col] : undefined;
  };
  // Mã / số điện thoại / mã số thuế Excel hay tự đổi thành số: 0909… → 909…
  const str = (cells: Record<string, unknown>, key: PartnerField): string | null => {
    const v = cell(cells, key);
    const text = typeof v === "number" ? String(readNumber(v) ?? "") : (readString(v)?.trim() ?? "");
    return text === "" ? null : text;
  };

  const rows = sheet.rows.map((raw): PartnerRpcRow => {
    const c = raw.cells;
    const code = str(c, "code");
    const kindText = str(c, "kind") ?? "";
    const kind = parsePartnerKind(kindText);
    if (kind === "INVALID") {
      issues.push({ row: raw.rowNumber, docNo: code ?? "", message: `Loại "${kindText}" không đọc được — ghi Nhà cung cấp, Khách hàng hoặc Cả hai` });
    }
    const active = parseActiveFlag(cell(c, "isActive"));
    if (active === "INVALID") {
      issues.push({ row: raw.rowNumber, docNo: code ?? "", message: "Đang hoạt động phải là 1 / Có hoặc 0 / Không" });
    }
    return {
      dong: raw.rowNumber,
      ma: code,
      ten: str(c, "name")?.replace(/\s+/g, " ") ?? null,
      loai: kind === "INVALID" ? null : kind,
      dien_thoai: str(c, "phone"),
      email: str(c, "email"),
      dia_chi: str(c, "address"),
      khu_vuc: str(c, "region"),
      phuong_xa: str(c, "ward"),
      ma_so_thue: str(c, "taxCode"),
      ghi_chu: str(c, "note"),
      dang_hoat_dong: active === "INVALID" ? null : active,
    };
  });
  return { rows, issues };
}

export type PartnerTemplateMode = "moi" | "cap_nhat";

/** Sheet 1 = dữ liệu (bộ đọc lấy sheet đầu), sheet 2 = hướng dẫn. */
export async function buildPartnerWorkbook(
  mode: PartnerTemplateMode,
  partners: readonly PartnerDetail[],
  sheetName?: string,
): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Minh Vũ";
  wb.created = new Date();

  const ws = wb.addWorksheet(sheetName ?? (mode === "moi" ? "Nhập mới" : "Cập nhật"));
  ws.columns = PARTNER_COLUMNS.map((c) => ({
    header: c.title + (mode === "moi" && c.required ? " *" : "") + (mode === "cap_nhat" && c.key === "code" ? " *" : ""),
    key: c.key,
    width: c.width,
  }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  // Mã, điện thoại, mã số thuế dạng chữ: Excel không được tự bỏ số 0 đầu.
  for (const key of ["code", "phone", "taxCode"] as const) ws.getColumn(key).numFmt = "@";

  for (const p of partners) {
    ws.addRow({
      code: p.code,
      name: p.name,
      kind: PARTNER_KIND_EXCEL[p.kind],
      phone: p.phone,
      email: p.email,
      address: p.address,
      region: p.region,
      ward: p.ward,
      taxCode: p.taxCode,
      note: p.note,
      isActive: p.isActive ? 1 : 0,
    });
  }

  const guide = wb.addWorksheet("Hướng dẫn");
  guide.columns = [
    { header: "Cột", key: "col", width: 20 },
    { header: "Cách điền", key: "hint", width: 100 },
  ];
  guide.getRow(1).font = { bold: true };
  for (const c of PARTNER_COLUMNS) guide.addRow({ col: c.title, hint: c.hint });
  guide.addRow({});
  const notes =
    mode === "moi"
      ? ["Mỗi dòng là một đối tác mới. Mã đã có trên hệ thống sẽ bị báo lỗi — muốn sửa thì dùng file mẫu cập nhật."]
      : ["Tìm đối tác theo Mã nhà cung cấp. Ô để trống = giữ nguyên giá trị đang có."];
  for (const n of notes) guide.addRow({ col: "Lưu ý", hint: n });

  return Buffer.from(await wb.xlsx.writeBuffer());
}
