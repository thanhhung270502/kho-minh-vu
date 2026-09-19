/**
 * Hồ sơ dữ liệu của 4 file export — chạy TRƯỚC khi quyết định ánh xạ.
 *
 *   npx tsx scripts/import-kiotviet/phan-tich.ts
 *
 * Không ghi gì. Chỉ đếm và liệt kê những thứ ảnh hưởng tới quyết định nạp.
 */
import { readdirSync } from "node:fs";
import path from "node:path";

import { docSheet, readString, readNumber } from "./read-file";

const DIR = path.join("data", "kiotviet");
const tim = (tienTo: string) => {
  const f = readdirSync(DIR).find((x) => x.startsWith(tienTo) && x.endsWith(".xlsx"));
  if (!f) throw new Error(`thiếu file ${tienTo}`);
  return path.join(DIR, f);
};

function dem(ds: (string | null)[]): [string, number][] {
  const m = new Map<string, number>();
  for (const v of ds) m.set(v ?? "(rỗng)", (m.get(v ?? "(rỗng)") ?? 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

async function main() {
  // ─── Sản phẩm ───
  const sp = await docSheet(tim("DanhSachSanPham"));
  console.log(`\n═══ SẢN PHẨM — ${sp.length} dòng`);

  const dvt = dem(sp.map((d) => readString(d.cells["dvt"])));
  console.log(`\nĐVT (${dvt.length} giá trị):`);
  for (const [k, n] of dvt) console.log(`  ${String(n).padStart(5)}  ${k}`);

  const nhom = dem(sp.map((d) => readString(d.cells["nhom_hang_3_cap"])));
  console.log(`\nNhóm hàng(3 Cấp) — ${nhom.length} giá trị phân biệt. 25 nhóm đông nhất:`);
  for (const [k, n] of nhom.slice(0, 25)) console.log(`  ${String(n).padStart(5)}  ${k}`);
  const coGach = nhom.filter(([k]) => k.includes(" - ")).length;
  const coNgoac = nhom.filter(([k]) => k.includes(">>")).length;
  console.log(`  → ${coGach} giá trị chứa " - ", ${coNgoac} chứa ">>"`);
  const capDau = dem(nhom.map(([k]) => k.split(" - ")[0]?.trim() ?? k));
  console.log(`  → nếu " - " là phân cấp: ${capDau.length} nhóm cấp 1. Mẫu: ${capDau.slice(0, 12).map(([k]) => k).join(" · ")}`);

  const conversion = dem(sp.map((d) => readString(d.cells["quy_doi"])));
  console.log(`\nQuy đổi: ${conversion.map(([k, n]) => `${k}=${n}`).join(" · ")}`);

  const dvtCoBan = dem(sp.map((d) => readString(d.cells["ma_dvt_co_ban"])));
  console.log(`Mã ĐVT Cơ bản (${dvtCoBan.length} giá trị, 8 đầu): ${dvtCoBan.slice(0, 8).map(([k, n]) => `${k}=${n}`).join(" · ")}`);

  const loai = dem(sp.map((d) => readString(d.cells["loai_hang"])));
  console.log(`Loại hàng: ${loai.map(([k, n]) => `${k}=${n}`).join(" · ")}`);

  const kd = dem(sp.map((d) => readString(d.cells["dang_kinh_doanh"])));
  console.log(`Đang kinh doanh: ${kd.map(([k, n]) => `${k}=${n}`).join(" · ")}`);

  const ma = sp.map((d) => readString(d.cells["ma_hang"]));
  const trung = dem(ma).filter(([, n]) => n > 1);
  console.log(`Mã hàng trùng: ${trung.length}${trung.length ? " → " + trung.slice(0, 10).map(([k, n]) => `${k}×${n}`).join(", ") : ""}`);
  console.log(`Mã hàng rỗng: ${ma.filter((m) => !m).length}`);

  const giaBan = sp.map((d) => readNumber(d.cells["gia_ban"]) ?? 0);
  console.log(`Giá bán > 0: ${giaBan.filter((g) => g > 0).length}/${sp.length}`);

  const ton = sp.map((d) => readNumber(d.cells["ton_kho"]) ?? 0);
  console.log(`Tồn kho: tổng ${ton.reduce((a, b) => a + b, 0).toLocaleString("vi-VN")} · âm ${ton.filter((t) => t < 0).length} mã · >0 ${ton.filter((t) => t > 0).length} mã`);

  const viTri = sp.filter((d) => readString(d.cells["vi_tri"])).length;
  const hinh = sp.filter((d) => readString(d.cells["hinh_anh_url1_url2"])).length;
  const description = sp.filter((d) => readString(d.cells["mo_ta"])).length;
  const tonMin = sp.filter((d) => (readNumber(d.cells["ton_nho_nhat"]) ?? 0) > 0).length;
  console.log(`Có vị trí: ${viTri} · có hình: ${hinh} · có mô tả: ${description} · tồn nhỏ nhất > 0: ${tonMin}`);

  // ─── Nhà cung cấp ───
  const ncc = await docSheet(tim("DanhSachNhaCungCap"));
  console.log(`\n═══ NHÀ CUNG CẤP — ${ncc.length} dòng`);
  for (const d of ncc) {
    const m = readString(d.cells["ma_nha_cung_cap"]) ?? "";
    console.log(
      `  ${m.padEnd(12)} ${String(readString(d.cells["ten_nha_cung_cap"]) ?? "").slice(0, 40).padEnd(40)}` +
        ` MST=${readString(d.cells["ma_so_thue"]) ?? "—"}  nhóm=${readString(d.cells["nhom_nha_cung_cap"]) ?? "—"}` +
        `  TT=${readString(d.cells["trang_thai"]) ?? "—"}  tổng mua=${readString(d.cells["tong_mua"]) ?? "—"}`,
    );
  }

  // ─── Phiếu nhập ───
  const nhap = await docSheet(tim("DanhSachChiTietNhapHang"));
  console.log(`\n═══ CHI TIẾT NHẬP — ${nhap.length} dòng`);
  const nccNhap = dem(nhap.map((d) => `${readString(d.cells["ma_nha_cung_cap"])} ${readString(d.cells["ten_nha_cung_cap"])}`));
  for (const [k, n] of nccNhap) console.log(`  ${String(n).padStart(4)}  ${k}`);
  const maSp = new Set(ma.filter(Boolean));
  const maNhapLa = dem(nhap.map((d) => readString(d.cells["ma_hang"])).filter((m) => m && !maSp.has(m)));
  console.log(`  Mã hàng trên phiếu nhập KHÔNG có trong danh mục: ${maNhapLa.length}${maNhapLa.length ? " → " + maNhapLa.map(([k]) => k).join(", ") : ""}`);

  // ─── Hóa đơn ───
  const hd = await docSheet(tim("DanhSachChiTietHoaDon"));
  console.log(`\n═══ CHI TIẾT HÓA ĐƠN — ${hd.length} dòng`);
  const kh = dem(hd.map((d) => `${readString(d.cells["ma_khach_hang"])} ${readString(d.cells["ten_khach_hang"])}`));
  console.log(`  Khách hàng (${kh.length}): ${kh.slice(0, 5).map(([k, n]) => `${k}×${n}`).join(" · ")}`);
  const ghiChu = dem(hd.map((d) => readString(d.cells["ghi_chu"])));
  console.log(`  Ghi chú — ${ghiChu.length} giá trị. 15 đầu:`);
  for (const [k, n] of ghiChu.slice(0, 15)) console.log(`    ${String(n).padStart(5)}  ${k.slice(0, 60)}`);
  const donGia = hd.filter((d) => (readNumber(d.cells["don_gia"]) ?? 0) > 0).length;
  console.log(`  Đơn giá > 0: ${donGia}/${hd.length}`);
  const maHdLa = dem(hd.map((d) => readString(d.cells["ma_hang"])).filter((m) => m && !maSp.has(m)));
  console.log(`  Mã hàng trên hóa đơn KHÔNG có trong danh mục: ${maHdLa.length}${maHdLa.length ? " → " + maHdLa.map(([k, n]) => `${k}×${n}`).join(", ") : ""}`);
  const trangThai = dem(hd.map((d) => readString(d.cells["trang_thai"])));
  console.log(`  Trạng thái: ${trangThai.map(([k, n]) => `${k}=${n}`).join(" · ")}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
