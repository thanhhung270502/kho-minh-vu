/**
 * Đọc và ghi file Excel danh mục. CHỈ CHẠY Ở SERVER (Route Handler).
 *
 * KHÔNG dùng `import "server-only"`: gói đó ném lỗi khi chạy ngoài điều kiện
 * `react-server`, mà `scripts/kiem-tra-doc-excel.ts` phải import được để kiểm trên
 * file KiotViet thật. Hàng rào thật là `node:stream` bên trong `o-excel.ts` —
 * import nhầm vào Client Component là build hỏng ngay.
 */
import ExcelJS from "exceljs";

import { doChuoi, docSheetDau, doSo } from "@/shared/lib/o-excel";
import { tachDvtCongDoan } from "@/shared/lib/tach-dvt-cong-doan";

import { COT_MAU, type DongNhap, type DongXuat } from "./mau-excel";

export type DinhDangFile = "mau_moi" | "kiotviet";

/** KiotViet dùng 999999999 nghĩa là "không giới hạn" (bài học Phase 1). */
const KHONG_GIOI_HAN = 999_999_999;

const CO = new Set(["co", "x", "1", "true", "yes"]);
const KHONG = new Set(["khong", "0", "false", "no"]);

function docCo(v: unknown): boolean | null {
  const s = doChuoi(v);
  if (s === null) return null;

  const chuan = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase()
    .trim();

  if (CO.has(chuan)) return true;
  if (KHONG.has(chuan)) return false;
  return null;
}

function nhanDang(tenCot: string[]): DinhDangFile {
  const co = (k: string) => tenCot.includes(k);

  if (co("ma_hang") && co("don_vi_tinh") && co("cong_doan")) return "mau_moi";
  if (co("ma_hang") && co("dvt") && co("nhom_hang_3_cap")) return "kiotviet";

  throw new Error(
    "Không nhận ra mẫu file. Cần các cột: Mã hàng, Tên hàng, Đơn vị tính, Công đoạn — " +
      "hoặc dùng thẳng file DanhSachSanPham xuất từ KiotViet.",
  );
}

function dongMauMoi(o: Record<string, unknown>, soDong: number): DongNhap {
  const toiDa = doSo(o["ton_toi_da"]);

  return {
    dong: soDong,
    ma_hang: doChuoi(o["ma_hang"]),
    ten_hang: doChuoi(o["ten_hang"]),
    nhom_hang: doChuoi(o["nhom_hang"]),
    dvt: doChuoi(o["don_vi_tinh"]),
    cong_doan: doChuoi(o["cong_doan"]),
    quy_doi: doSo(o["quy_doi"]),
    kho_mac_dinh: doChuoi(o["kho_mac_dinh"]),
    ton_toi_thieu: doSo(o["ton_toi_thieu"]),
    ton_toi_da: toiDa,
    gia_ban: doSo(o["gia_ban"]),
    dang_kinh_doanh: docCo(o["dang_kinh_doanh"]),
    barcode: doChuoi(o["barcode"]),
    ghi_chu: doChuoi(o["ghi_chu"]),
  };
}

function dongKiotViet(o: Record<string, unknown>, soDong: number): DongNhap {
  const tach = tachDvtCongDoan(doChuoi(o["dvt"]));
  const toiDa = doSo(o["ton_lon_nhat"]);
  const giaBan = doSo(o["gia_ban"]);

  return {
    dong: soDong,
    ma_hang: doChuoi(o["ma_hang"]),
    ten_hang: doChuoi(o["ten_hang"]),
    nhom_hang: doChuoi(o["nhom_hang_3_cap"]),
    dvt: tach.maDvt,
    // Ô ĐVT của KiotViet chỉ suy được công đoạn cho hàng đã qua xử lý bề mặt.
    // 1.571 mã "CÁI" không suy được — gửi null để GIỮ NGUYÊN công đoạn người dùng
    // đã rà, và chỉ dùng MUA_NGOAI khi tạo mã mới (D-22).
    cong_doan: tach.suyDuoc ? tach.maCongDoan : null,
    cong_doan_khi_tao_moi: "MUA_NGOAI",
    quy_doi: doSo(o["quy_doi"]) ?? 1,
    // Cột "Vị trí" của KiotViet chứa TÊN KHO, không phải dãy/kệ (lỗi UAT Phase 1).
    kho_mac_dinh: doChuoi(o["vi_tri"]),
    ton_toi_thieu: doSo(o["ton_nho_nhat"]),
    ton_toi_da: toiDa === null || toiDa >= KHONG_GIOI_HAN ? null : toiDa,
    // Giá bán trên hệ cũ bằng 0 cho cả 3.266 mã — gửi 0 là ghi đè giá quản lý vừa đặt.
    gia_ban: giaBan ? giaBan : null,
    dang_kinh_doanh: doChuoi(o["dang_kinh_doanh"]) !== "0",
    ghi_chu: doChuoi(o["mo_ta"]),
  };
}

export async function docFileDanhMuc(
  buf: Buffer,
): Promise<{ dinhDang: DinhDangFile; dong: DongNhap[] }> {
  let doc;
  try {
    doc = await docSheetDau(buf);
  } catch {
    throw new Error(
      "Không đọc được file Excel. Kiểm tra file còn mở được bằng Excel và đúng đuôi .xlsx.",
    );
  }

  const dinhDang = nhanDang(doc.tenCot);
  const dong = doc.dong.map((d) =>
    dinhDang === "mau_moi" ? dongMauMoi(d.o, d.soDong) : dongKiotViet(d.o, d.soDong),
  );

  return { dinhDang, dong };
}

const HUONG_DAN: Array<[string, string]> = [
  ["Ô để trống", "Giữ nguyên giá trị đang có. Muốn xóa thì sửa trong app."],
  ["Mã hàng", "Khóa để đối chiếu. Mã chưa có thì thêm mới, mã đã có thì cập nhật."],
  [
    "Nhóm hàng / Đơn vị tính / Công đoạn / Kho mặc định",
    "Phải là tên hoặc mã đã có trong Cài đặt. Chưa có thì tạo trước, file sẽ báo lỗi dòng.",
  ],
  ["Đang kinh doanh", "Ghi Có / Không (hoặc 1 / 0)."],
  ["Tồn hiện tại, Giá vốn", "Chỉ để xem. Nhập vào sẽ bị bỏ qua — tồn chỉ đổi bằng chứng từ."],
];

/** Ghi file mẫu hệ mới. Dùng workbook thường (ghi không gặp bẫy styles như khi đọc). */
export async function taoFileMau(
  dong: DongXuat[],
  { coGiaVon }: { coGiaVon: boolean },
): Promise<Buffer> {
  const cot = COT_MAU.filter((c) => c.khoa !== "gia_von" || coGiaVon);

  const wb = new ExcelJS.Workbook();
  wb.creator = "Kho Minh Vũ";
  wb.created = new Date();

  const ws = wb.addWorksheet("Danh mục");
  ws.columns = cot.map((c) => ({ header: c.tieuDe, key: c.khoa, width: c.rong }));
  ws.getRow(1).font = { bold: true };
  ws.views = [{ state: "frozen", ySplit: 1 }];
  ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: cot.length } };

  for (const d of dong) {
    ws.addRow(
      Object.fromEntries(
        cot.map((c) => {
          const v = (d as Record<string, unknown>)[c.khoa] ?? null;
          if (c.khoa === "dang_kinh_doanh") return [c.khoa, v === false ? "Không" : "Có"];
          return [c.khoa, v];
        }),
      ),
    );
  }

  const huongDan = wb.addWorksheet("Hướng dẫn");
  huongDan.columns = [
    { header: "Cột", key: "cot", width: 42 },
    { header: "Cách điền", key: "cach", width: 80 },
  ];
  huongDan.getRow(1).font = { bold: true };
  for (const [c, cach] of HUONG_DAN) huongDan.addRow({ cot: c, cach });

  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out);
}

/** Dòng đọc lên rồi ghi lại — dùng cho kiểm quay vòng. */
export function dongNhapThanhDongXuat(d: DongNhap): DongXuat {
  return { ...d };
}
