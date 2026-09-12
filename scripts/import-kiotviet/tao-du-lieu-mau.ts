/**
 * Sinh bốn file .xlsx mẫu để test script import khi chưa có file thật.
 *
 *   npx tsx scripts/import-kiotviet/tao-du-lieu-mau.ts
 *
 * Dữ liệu mẫu CỐ Ý chứa đủ các ca lỗi đã biết của file KiotViet — đây là bộ
 * test của chính script import:
 *   - dòng thiếu mã hàng
 *   - mã hàng trùng
 *   - ô số định dạng Text ("1.250.000")
 *   - dòng "TỔNG CỘNG" ở cuối sheet
 *   - ĐVT lạ không thuộc tập đã biết
 *   - ô rich text
 *   - cột mã NCC chứa mã số thuế
 */
import ExcelJS from "exceljs";
import { mkdirSync } from "node:fs";
import path from "node:path";

const THU_MUC = path.join("scripts", "import-kiotviet", "du-lieu-mau");

async function ghi(ten: string, cot: string[], dong: unknown[][]) {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Sheet1");
  ws.addRow(cot);
  for (const d of dong) ws.addRow(d);
  await wb.xlsx.writeFile(path.join(THU_MUC, `${ten}.xlsx`));
  console.log(`  ${ten}.xlsx — ${dong.length} dòng`);
}

async function main() {
  mkdirSync(THU_MUC, { recursive: true });
  console.log(`Sinh dữ liệu mẫu vào ${THU_MUC}:`);

  await ghi(
    "DanhSachSanPham",
    ["Mã hàng", "Tên hàng", "Nhóm hàng", "ĐVT", "Giá bán", "Tồn kho", "Ghi chú"],
    [
      ["BD-001", "Bạc đạn 6202", "NẠ - 75", "CÁI", 25000, 120, null],
      ["BD-002", "Bạc đạn 6203", "NẠ - 75", "CÁI", "1.250.000", 80, null],   // số dạng Text
      ["SN-001", "Ốp sườn sơn", "ỐP - 12", "SƠN", 45000, 30, null],
      ["CB-001", "Nắp carbon", "NẮP - 08", "CARBON", 150000, 15, null],
      ["XM-001", "Cùm xi mạ", "CÙM - 21", "XI MẠ", 60000, 42, null],
      ["EP-001", "Vỏ ép nhựa", "VỎ - 03", "ÉP", 35000, 200, null],
      ["NN-001", "Kính nano", "KÍNH - 44", "NANO", 90000, 8, null],
      ["CP-001", "Cặp gương", "GƯƠNG - 17", "CẶP", 120000, 25, null],        // quy_doi = 2
      ["BO-001", "Bộ ốc vít", "ỐC - 91", "BỘ", 15000, 300, null],
      ["LA-001", "Hàng đơn vị lạ", "KHÁC - 99", "THÙNG", 10000, 5, null],    // ĐVT lạ
      ["BD-001", "Bạc đạn 6202 (trùng mã)", "NẠ - 75", "CÁI", 25000, 0, null], // trùng mã
      [null, "Hàng thiếu mã", "KHÁC - 99", "CÁI", 5000, 1, null],            // thiếu mã hàng
      ["GB-001", "Hàng giá lỗi", "KHÁC - 99", "CÁI", "N/A", 3, null],        // giá không parse được
      ["TỔNG CỘNG", null, null, null, null, 829, null],                      // dòng tổng
    ],
  );

  await ghi(
    "DanhSachNhaCungCap",
    ["Mã NCC", "Tên NCC", "Điện thoại", "Email", "Địa chỉ", "Mã số thuế"],
    [
      ["NCC000001", "Nhà máy Vũ Trụ L.An", "0901234567", "vutru@example.com", "Long An", "0312345678"],
      ["NCC000002", "Phụ tùng Miền Nam", "0912345678", null, "TP.HCM", null],
      ["0317415317", "NCC ghi nhầm mã số thuế vào ô mã", "0923456789", null, "Bình Dương", null],
      [null, "NCC thiếu mã", "0934567890", null, null, null],
      ["NCC000005", null, "0945678901", null, null, null],                   // thiếu tên
    ],
  );

  await ghi(
    "ChiTietNhapHang",
    ["Mã phiếu", "Ngày", "Nhà cung cấp", "Mã hàng", "Tên hàng", "Số lượng", "Đơn giá", "Thành tiền"],
    [
      ["PN0001", "03/09/2026", "Nhà máy Vũ Trụ L.An", "BD-001", "Bạc đạn 6202", 50, 0, 0],
      ["PN0001", "03/09/2026", "Nhà máy Vũ Trụ L.An", "SN-001", "Ốp sườn sơn", 20, 0, 0],
      ["PN0002", "05/09/2026", "Phụ tùng Miền Nam", "CB-001", "Nắp carbon", 10, 0, 0],
    ],
  );

  await ghi(
    "ChiTietHoaDon",
    ["Mã hóa đơn", "Ngày", "Khách hàng", "Mã hàng", "Tên hàng", "Số lượng", "Đơn giá", "Thành tiền", "Ghi chú"],
    [
      ["HD0001", "04/09/2026", "BỘ PHẬN ĐIỀU PHỐI ĐƠN", "BD-001", "Bạc đạn 6202", 5, 0, 0, "QUỲNH"],
      ["HD0002", "04/09/2026", "BỘ PHẬN ĐIỀU PHỐI ĐƠN", "SN-001", "Ốp sườn sơn", 2, 0, 0, "NGỌC"],
      ["HD0003", "06/09/2026", "BỘ PHẬN ĐIỀU PHỐI ĐƠN", "CB-001", "Nắp carbon", 1, 0, 0, "TỐT"],
    ],
  );

  console.log("\nChạy thử: npm run import:kiotviet -- --mau");
  console.log("Kỳ vọng: thoát mã 1 vì dữ liệu mẫu cố ý có 3 lỗi.\n");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
