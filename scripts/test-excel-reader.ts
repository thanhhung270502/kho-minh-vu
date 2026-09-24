/**
 * Kiểm bộ đọc Excel trên FILE KIOTVIET THẬT, không phải file tự tạo.
 *
 *   npx tsx scripts/test-excel-reader.ts
 *
 * Lý do bắt buộc dùng file thật: lỗi `reading 'styles'` chỉ xuất hiện với file do
 * KiotViet xuất ra; file tự tạo sạch sẽ không tái hiện được (bẫy Phase 1).
 */
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import ExcelJS from "exceljs";

import {
  readCatalogFile,
  toExportRow,
  buildTemplateWorkbook,
} from "../src/features/products/lib/read-catalog-file.server";
import {
  buildCountTemplate,
  STOCKTAKE_TEMPLATE_COLUMNS,
} from "../src/features/stocktake/lib/count-template.server";
import { readCountFile } from "../src/features/stocktake/lib/read-count-file.server";

async function main() {
  const THU_MUC = "data/kiotviet";

  const ten = readdirSync(THU_MUC).find(
    (f) => f.startsWith("DanhSachSanPham") && f.endsWith(".xlsx"),
  );
  assert.ok(ten, `Cần ${THU_MUC}/DanhSachSanPham*.xlsx (dữ liệu thật, không commit)`);

  const kv = await readCatalogFile(readFileSync(join(THU_MUC, ten)));
  assert.equal(kv.dinhDang, "kiotviet", "nhận ra file KiotViet");
  assert.equal(kv.dong.length, 3266, "đọc đủ 3.266 mã, không crash vì styles.xml lệch chuẩn");
  assert.ok(
    kv.dong.every((d) => d.dong >= 2),
    "số dòng là số dòng THẬT trong Excel để người dùng mở đúng chỗ",
  );

  const carbon = kv.dong.find((d) => d.cong_doan === "CARBON");
  assert.ok(carbon, "mã qua xử lý bề mặt suy được công đoạn từ ô ĐVT");

  const khongSuyDuoc = kv.dong.find((d) => d.cong_doan === null);
  assert.ok(khongSuyDuoc, "mã 'CÁI' không suy được công đoạn");
  assert.equal(
    khongSuyDuoc.cong_doan_khi_tao_moi,
    "MUA_NGOAI",
    "mã không suy được chỉ nhận công đoạn mặc định KHI TẠO MỚI, không ghi đè mã đã rà",
  );

  assert.ok(
    kv.dong.every((d) => d.gia_ban === null),
    "giá bán 0 của hệ cũ không được gửi đi (sẽ ghi đè giá quản lý vừa đặt)",
  );

  const coKho = kv.dong.filter((d) => d.kho_mac_dinh === "Kho 2").length;
  assert.equal(coKho, 26, "cột Vị trí của KiotViet là TÊN KHO — 26 mã ở Kho 2");

  // Quay vòng: xuất mẫu hệ mới rồi đọc lại
  const nam = kv.dong.slice(0, 5);
  const buf = await buildTemplateWorkbook(nam.map(toExportRow), { includeCost: false });
  const mm = await readCatalogFile(buf);

  assert.equal(mm.dinhDang, "mau_moi", "nhận ra mẫu hệ mới");
  assert.deepEqual(
    mm.dong.map((d) => d.ma_hang),
    nam.map((d) => d.ma_hang),
    "file xuất ra đọc lại được, không mất mã nào",
  );
  assert.deepEqual(
    mm.dong.map((d) => d.dvt),
    nam.map((d) => d.dvt),
    "đơn vị tính quay vòng không đổi",
  );

  await assert.rejects(
    () => readCatalogFile(Buffer.from("day khong phai xlsx")),
    /không đọc được file excel/i,
    "file hỏng báo lỗi đọc hiểu được, không ném lỗi thô",
  );

  console.log("✓ đọc Excel: file KiotViet thật + mẫu hệ mới quay vòng");

  // --- Mẫu đếm kiểm kê (D-08: không cột số liệu hệ thống) + đọc lại --------
  assert.equal(STOCKTAKE_TEMPLATE_COLUMNS.length, 4, "mẫu đếm có đúng 4 cột");
  assert.ok(
    !STOCKTAKE_TEMPLATE_COLUMNS.some(
      (c) => /ton/i.test(c.key) || /tồn/i.test(c.title),
    ),
    "mẫu đếm không có cột tồn nào (D-08)",
  );

  const baDong = [
    { code: "MA001", name: "Hàng 1", unit: "CÁI" },
    { code: "MA002", name: "Hàng 2", unit: "BỘ" },
    { code: "MA003", name: "Hàng 3", unit: "CÁI" },
  ];
  const bufMauTrong = await buildCountTemplate(baDong, {
    sessionNo: "PK26-000001",
    warehouseName: "Kho 1",
    categoryName: null,
  });
  const mauTrong = await readCountFile(bufMauTrong);
  assert.equal(mauTrong.length, 3, "đọc lại đủ 3 dòng vừa xuất");
  assert.ok(
    mauTrong.every((d) => d.so_dem === null),
    "ô Số đếm để trống = chưa đếm, không phải 0",
  );
  assert.deepEqual(
    mauTrong.map((d) => d.ma_hang),
    baDong.map((d) => d.code),
    "mã hàng quay vòng không đổi",
  );

  // Điền số đếm rồi đọc lại — hiểu cả số nguyên lẫn định dạng thập phân VN,
  // ô để trống vẫn là chưa đếm.
  const bufDeDien = await buildCountTemplate(baDong, {
    sessionNo: "PK26-000001",
    warehouseName: "Kho 1",
    categoryName: "Nhóm A",
  });
  const wbDaDien = new ExcelJS.Workbook();
  await wbDaDien.xlsx.load(
    bufDeDien as unknown as Parameters<typeof wbDaDien.xlsx.load>[0],
  );
  const wsDaDien = wbDaDien.worksheets[0];
  const soDemCol =
    STOCKTAKE_TEMPLATE_COLUMNS.findIndex((c) => c.key === "so_dem") + 1;
  wsDaDien.getRow(2).getCell(soDemCol).value = 5;
  wsDaDien.getRow(3).getCell(soDemCol).value = "1.234,5";
  wsDaDien.getRow(4).getCell(soDemCol).value = null;
  const bufDaDien = Buffer.from(await wbDaDien.xlsx.writeBuffer());
  const daDien = await readCountFile(bufDaDien);
  assert.deepEqual(
    daDien.map((d) => d.so_dem),
    [5, 1234.5, null],
    "đọc số đếm hiểu số nguyên, định dạng thập phân VN, và ô trống = chưa đếm",
  );

  // Quay vòng 1.200 dòng — cỡ hỏng của reader dạng stream đã biết (bẫy 7).
  const nhieuDong = Array.from({ length: 1200 }, (_, i) => ({
    code: `MA${String(i + 1).padStart(5, "0")}`,
    name: `Hàng ${i + 1}`,
    unit: "CÁI",
  }));
  const bufNhieu = await buildCountTemplate(nhieuDong, {
    sessionNo: "PK26-000002",
    warehouseName: "Kho 1",
    categoryName: null,
  });
  const nhieu = await readCountFile(bufNhieu);
  assert.equal(
    nhieu.length,
    1200,
    "quay vòng 1.200 dòng vẫn đọc đủ, không mất dòng vì lệch thứ tự zip",
  );

  // File thiếu cột "Số đếm" → báo lỗi đọc hiểu được, nói rõ cần hai cột nào.
  const wbThieuCot = new ExcelJS.Workbook();
  const wsThieuCot = wbThieuCot.addWorksheet("Đếm");
  wsThieuCot.columns = [
    { header: "Mã hàng", key: "ma_hang" },
    { header: "Tên hàng", key: "ten_hang" },
  ];
  wsThieuCot.addRow({ ma_hang: "MA001", ten_hang: "Hàng 1" });
  const bufThieuCot = Buffer.from(await wbThieuCot.xlsx.writeBuffer());
  await assert.rejects(
    () => readCountFile(bufThieuCot),
    /Mã hàng.*Số đếm|Số đếm.*Mã hàng/,
    "thiếu cột Số đếm báo lỗi tiếng Việt nói rõ cần hai cột Mã hàng và Số đếm",
  );

  console.log(
    "✓ mẫu đếm kiểm kê: xuất/đọc quay vòng, không lộ số liệu hệ thống, ô trống = chưa đếm",
  );
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
