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

import {
  readCatalogFile,
  toExportRow,
  buildTemplateWorkbook,
} from "../src/features/products/lib/read-catalog-file.server";

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
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
