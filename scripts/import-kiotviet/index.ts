/**
 * Nạp dữ liệu KiotViet.
 *
 *   npm run import:kiotviet -- --dry-run   # đọc, kiểm, báo cáo (mặc định)
 *   npm run import:kiotviet -- --mau       # chạy trên dữ liệu mẫu tự sinh
 *   npm run import:kiotviet -- --ghi       # nạp thật
 *
 * MẶC ĐỊNH AN TOÀN: không có cờ nào thì chạy như --dry-run. Không để người dùng
 * vô tình ghi đè dữ liệu bằng một lệnh gõ thiếu.
 */
import { existsSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

import { docSheet, type RawRow } from "./doc-file";
import { kiemTraSanPham, kiemTraDoiTac, type CanhBao, type Loi } from "./kiem-tra";
import { napDuLieu, napLuuTruHoaDon, napLuuTruNhap } from "./nap-du-lieu";

const co = new Set(process.argv.slice(2));
const GHI = co.has("--ghi");
const MAU = co.has("--mau");

const THU_MUC = MAU
  ? path.join("scripts", "import-kiotviet", "du-lieu-mau")
  : path.join("data", "kiotviet");

// KiotViet xuất file kèm timestamp, ví dụ:
//   DanhSachSanPham_KV12092026-153850-575.xlsx
// nên khớp theo TIỀN TỐ chứ không theo tên chính xác. README dặn người dùng
// giữ nguyên tên KiotViet xuất ra — giả định "tên chính xác" ban đầu là sai.
const FILE = {
  sanPham: "DanhSachSanPham",
  doiTac: "DanhSachNhaCungCap",
  nhapHang: "DanhSachChiTietNhapHang",
  hoaDon: "DanhSachChiTietHoaDon",
};

function duongDan(tienTo: string): string {
  const chinhXac = path.join(THU_MUC, `${tienTo}.xlsx`);
  if (existsSync(chinhXac)) return chinhXac;

  let ungVien: string[] = [];
  try {
    ungVien = readdirSync(THU_MUC)
      .filter((f) => f.toLowerCase().endsWith(".xlsx") && !f.startsWith("~$"))
      .filter((f) => f.toLowerCase().startsWith(tienTo.toLowerCase()));
  } catch {
    return chinhXac; // để docSheet ném lỗi có hướng xử lý
  }

  if (ungVien.length === 0) return chinhXac;

  if (ungVien.length > 1) {
    // Nhiều bản export cùng loại — lấy bản mới nhất theo thời gian sửa file,
    // và nói rõ để người dùng biết bản nào đang được dùng.
    ungVien.sort(
      (a, b) =>
        statSync(path.join(THU_MUC, b)).mtimeMs - statSync(path.join(THU_MUC, a)).mtimeMs,
    );
    console.warn(
      `  ⚠ Có ${ungVien.length} file khớp "${tienTo}". Dùng bản mới nhất: ${ungVien[0]}`,
    );
  }

  return path.join(THU_MUC, ungVien[0]!);
}

function inKhoi(ten: string, rowNumber: number, hopLe: number, loi: Loi[], canhBao: CanhBao[]) {
  console.log(`\n${path.basename(duongDan(ten))}`);
  console.log(`  Đọc được   ${String(rowNumber).padStart(6)} dòng`);
  console.log(`  Hợp lệ     ${String(hopLe).padStart(6)} dòng`);
  console.log(`  Lỗi        ${String(loi.length).padStart(6)}`);
  console.log(`  Cảnh báo   ${String(canhBao.length).padStart(6)}`);

  if (loi.length) {
    console.log("\n  LỖI");
    for (const l of loi.slice(0, 30)) {
      console.log(
        `    Dòng ${String(l.rowNumber).padStart(5)}  ${l.truong.padEnd(16)} ${l.lyDo}` +
          (l.giaTri === null || l.giaTri === undefined ? "" : `  (giá trị: ${JSON.stringify(l.giaTri)})`),
      );
    }
    if (loi.length > 30) console.log(`    ... còn ${loi.length - 30} lỗi nữa`);
  }

  if (canhBao.length) {
    console.log("\n  CẢNH BÁO");
    for (const c of canhBao.slice(0, 20)) {
      console.log(`    ${c.rowNumber ? `Dòng ${String(c.rowNumber).padStart(5)}  ` : "            "}${c.lyDo}`);
    }
    if (canhBao.length > 20) console.log(`    ... còn ${canhBao.length - 20} cảnh báo nữa`);
  }
}

async function docAnToan(ten: string): Promise<RawRow[]> {
  try {
    return await docSheet(duongDan(ten));
  } catch (e) {
    console.error(`\n${ten}.xlsx — KHÔNG ĐỌC ĐƯỢC`);
    console.error(`  ${e instanceof Error ? e.message : e}`);
    return [];
  }
}

async function main() {
  console.log("═══ BÁO CÁO NẠP DỮ LIỆU KIOTVIET ═══");
  console.log(`Chế độ:    ${GHI ? "GHI THẬT" : "THỬ (không ghi database)"}`);
  console.log(`Thư mục:   ${THU_MUC}`);

  const [thoSanPham, thoDoiTac, thoNhap, thoHoaDon] = await Promise.all([
    docAnToan(FILE.sanPham),
    docAnToan(FILE.doiTac),
    docAnToan(FILE.nhapHang),
    docAnToan(FILE.hoaDon),
  ]);

  const kqSanPham = kiemTraSanPham(thoSanPham, FILE.sanPham);
  const kqDoiTac = kiemTraDoiTac(thoDoiTac, FILE.doiTac);

  inKhoi(FILE.sanPham, thoSanPham.length, kqSanPham.hopLe.length, kqSanPham.loi, kqSanPham.canhBao);
  inKhoi(FILE.doiTac, thoDoiTac.length, kqDoiTac.hopLe.length, kqDoiTac.loi, kqDoiTac.canhBao);
  console.log(`\n${path.basename(duongDan(FILE.nhapHang))}\n  ${thoNhap.length} dòng → bảng lưu trữ (không vào chung_tu)`);
  console.log(`${path.basename(duongDan(FILE.hoaDon))}\n  ${thoHoaDon.length} dòng → bảng lưu trữ`);

  const tongLoi = kqSanPham.loi.length + kqDoiTac.loi.length;

  console.log("\n" + "─".repeat(70));

  if (tongLoi > 0) {
    console.log(`TỔNG: ${tongLoi} lỗi. Sửa hết lỗi rồi chạy lại.`);
    console.log("Chỉ khi không còn LỖI mới thêm --ghi để nạp thật.");
    process.exit(1);
  }

  if (!GHI) {
    console.log("TỔNG: không có lỗi. Thêm --ghi để nạp thật.");
    console.log("\nLưu ý: tồn kho từ KiotViet KHÔNG được nạp. Tồn đầu kỳ set từ");
    console.log("kiểm kê thực tế ở Phase 6 — tồn khởi điểm sai thì cả hệ thống sai.");
    return;
  }

  console.log("Đang nạp...");
  const kq = await napDuLieu({ sanPham: kqSanPham.hopLe, doiTac: kqDoiTac.hopLe });
  const soNhap = await napLuuTruNhap(thoNhap);
  const soHoaDon = await napLuuTruHoaDon(thoHoaDon);

  console.log("\nĐã nạp:");
  console.table({
    "nhóm hàng": kq.nhom_hang,
    "đối tác": kq.doi_tac,
    "sản phẩm": kq.san_pham,
    "lưu trữ nhập": soNhap,
    "lưu trữ hóa đơn": soHoaDon,
  });

  if (kq.dungDoNhom.length) {
    console.log("\nMã nhóm hàng bị đụng, đã tự đổi:");
    for (const x of kq.dungDoNhom) console.log(`  ${x}`);
  }

  const tongTon = thoSanPham.reduce((s, d) => s + (Number(d.cells["ton_kho"]) || 0), 0);
  console.log(`\nTồn từ KiotViet (KHÔNG nạp, chỉ để đối chiếu): ${tongTon.toLocaleString("vi-VN")} đơn vị`);
  console.log("Chạy lại lệnh này lần nữa phải cho đúng những con số trên (idempotent).\n");
}

main().catch((e) => {
  console.error("\nimport:kiotviet thất bại:\n", e instanceof Error ? e.message : e, "\n");
  process.exit(1);
});
