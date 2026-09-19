/**
 * Validate từng dòng và GOM HẾT LỖI, không dừng ở lỗi đầu tiên.
 *
 * Ánh xạ cột dựa trên file export THẬT của KiotViet (12/09/2026), không phải
 * phỏng đoán. Xem cấu trúc bằng: npx tsx scripts/import-kiotviet/xem-cot.ts
 */
import { z } from "zod";

import { readString, readNumber, type RawRow } from "./doc-file";
import { splitUnitStage } from "./tach-dvt-cong-doan";

export type Loi = { rowNumber: number; truong: string; lyDo: string; giaTri: unknown };
export type CanhBao = { rowNumber: number | null; lyDo: string };

export type KetQuaKiemTra<T> = {
  hopLe: Array<{ rowNumber: number; duLieu: T; duLieuGoc: Record<string, unknown> }>;
  loi: Loi[];
  canhBao: CanhBao[];
};

/** Số dòng kỳ vọng từ PROJECT.md. Lệch thì cảnh báo, không coi là lỗi. */
export const SO_DONG_KY_VONG: Record<string, number> = {
  DanhSachSanPham: 3266,
  DanhSachNhaCungCap: 25,
  DanhSachChiTietNhapHang: 594,
  DanhSachChiTietHoaDon: 4732,
};

/**
 * Nhà cung cấp ẢO — KiotViet dùng làm mẹo để giả lập nghiệp vụ không có trường
 * chứa. Hệ mới có loại chứng từ riêng cho các nghiệp vụ này nên không nạp.
 */
export const NCC_AO = new Map<string, string>([
  ["NB001", "trả hàng giả lập bằng phiếu nhập — hệ mới dùng chứng từ TRA_KHACH"],
  ["NB002", "nhập bù tồn nội bộ — hệ mới dùng chứng từ DIEU_CHINH / KIEM_KE"],
]);

/** KiotViet dùng 999999999 nghĩa là "không giới hạn". */
const KHONG_GIOI_HAN = 999_999_999;

export const SanPhamSchema = z.object({
  ma_hang: z.string().min(1, "Thiếu mã hàng"),
  ten_hang: z.string().min(1, "Thiếu tên hàng"),
  loai_hang: z.string().nullable(),
  ten_nhom_hang: z.string().nullable(),
  dvt_goc: z.string().nullable(),
  quy_doi: z.number().positive("Quy đổi phải lớn hơn 0"),
  gia_ban: z.number().nonnegative("Giá bán không được âm"),
  ton_toi_thieu: z.number().nonnegative(),
  ton_toi_da: z.number().nonnegative().nullable(),
  ten_kho: z.string().nullable(),
  hinh_anh_url: z.string().nullable(),
  dang_kinh_doanh: z.boolean(),
  ton_kiotviet: z.number().nullable(),
  ghi_chu: z.string().nullable(),
});
export type SanPham = z.infer<typeof SanPhamSchema>;

export const DoiTacSchema = z.object({
  ma: z.string().min(1, "Thiếu mã đối tác"),
  ten: z.string().min(1, "Thiếu tên đối tác"),
  dien_thoai: z.string().nullable(),
  email: z.string().nullable(),
  dia_chi: z.string().nullable(),
  khu_vuc: z.string().nullable(),
  phuong_xa: z.string().nullable(),
  ma_so_thue: z.string().nullable(),
  ghi_chu: z.string().nullable(),
});
export type DoiTac = z.infer<typeof DoiTacSchema>;

function ghiLoi(loi: Loi[], rowNumber: number, kq: z.ZodSafeParseError<unknown>, tho: Record<string, unknown>) {
  for (const issue of kq.error.issues) {
    const truong = issue.path.join(".") || "(dòng)";
    loi.push({ rowNumber, truong, lyDo: issue.message, giaTri: tho[issue.path[0] as string] });
  }
}

export function kiemTraSanPham(dong: RawRow[], tenFile: string): KetQuaKiemTra<SanPham> {
  const hopLe: KetQuaKiemTra<SanPham>["hopLe"] = [];
  const loi: Loi[] = [];
  const canhBao: CanhBao[] = [];

  const daThay = new Map<string, number>();
  const dvtLa = new Map<string, number[]>();
  let inferred = 0;
  let chuaSuyDuoc = 0;
  let dvtRong = 0;
  let soCap = 0;
  let soCombo = 0;
  let tonAm = 0;

  for (const d of dong) {
    const toiDa = readNumber(d.cells["ton_lon_nhat"]);
    const hinh = readString(d.cells["hinh_anh_url1_url2"]);

    const tho = {
      ma_hang: readString(d.cells["ma_hang"]),
      ten_hang: readString(d.cells["ten_hang"]),
      loai_hang: readString(d.cells["loai_hang"]),
      ten_nhom_hang: readString(d.cells["nhom_hang_3_cap"]),
      dvt_goc: readString(d.cells["dvt"]),
      quy_doi: readNumber(d.cells["quy_doi"]) ?? 1,
      gia_ban: readNumber(d.cells["gia_ban"]) ?? 0,
      ton_toi_thieu: readNumber(d.cells["ton_nho_nhat"]) ?? 0,
      ton_toi_da: toiDa === null || toiDa >= KHONG_GIOI_HAN ? null : toiDa,
      // Cột "Vị trí" của KiotViet chứa TÊN KHO ("Kho 1" / "Kho 2"), không phải
      // dãy/kệ/tầng. Bản đầu nạp nhầm vào vi_tri_ke — lỗi UAT Phase 1, bài 3.
      ten_kho: readString(d.cells["vi_tri"]),
      // Cột chứa nhiều URL cách nhau dấu phẩy; lấy ảnh đầu tiên.
      hinh_anh_url: hinh ? (hinh.split(",")[0]?.trim() || null) : null,
      dang_kinh_doanh: readString(d.cells["dang_kinh_doanh"]) !== "0",
      ton_kiotviet: readNumber(d.cells["ton_kho"]),
      ghi_chu: readString(d.cells["mo_ta"]),
    };

    const kq = SanPhamSchema.safeParse(tho);
    if (!kq.success) {
      ghiLoi(loi, d.rowNumber, kq, tho);
      continue;
    }

    const truoc = daThay.get(kq.data.ma_hang);
    if (truoc !== undefined) {
      canhBao.push({
        rowNumber: d.rowNumber,
        lyDo: `Trùng mã hàng "${kq.data.ma_hang}" với dòng ${truoc}. Dòng sau ghi đè dòng trước.`,
      });
    }
    daThay.set(kq.data.ma_hang, d.rowNumber);

    const tach = splitUnitStage(kq.data.dvt_goc);
    if (tach.inferred) inferred++;
    else chuaSuyDuoc++;
    if (!kq.data.dvt_goc) dvtRong++;
    if (tach.unitCode === "CAP") soCap++;
    if (tach.unknownValue && kq.data.dvt_goc) {
      const ds = dvtLa.get(tach.unknownValue) ?? [];
      ds.push(d.rowNumber);
      dvtLa.set(tach.unknownValue, ds);
    }
    if (kq.data.loai_hang && kq.data.loai_hang !== "Hàng hóa") soCombo++;
    if ((kq.data.ton_kiotviet ?? 0) < 0) tonAm++;

    hopLe.push({ rowNumber: d.rowNumber, duLieu: kq.data, duLieuGoc: d.cells });
  }

  const kyVong = SO_DONG_KY_VONG[tenFile];
  if (kyVong && dong.length !== kyVong) {
    canhBao.push({
      rowNumber: null,
      lyDo: `Đọc được ${dong.length} dòng, PROJECT.md ghi ${kyVong}. Có thể là file export khác kỳ — cần xác nhận.`,
    });
  }

  canhBao.push({
    rowNumber: null,
    lyDo:
      `Công đoạn: suy được từ ĐVT cũ ${inferred} mã, chưa suy được ${chuaSuyDuoc} mã (tạm gán MUA_NGOAI, cần rà theo nhóm hàng).` +
      (dvtRong ? ` Trong đó ${dvtRong} mã có ô ĐVT RỖNG.` : ""),
  });

  if (soCap > 0) {
    canhBao.push({
      rowNumber: null,
      lyDo: `${soCap} mã đơn vị CẶP nhưng file ghi quy_doi = 1. Nạp đúng số trong file. XÁC NHẬN: 1 CẶP có phải là 1 đơn vị tồn kho không, hay là 2 CÁI?`,
    });
  }

  if (soCombo > 0) {
    canhBao.push({
      rowNumber: null,
      lyDo: `${soCombo} mã là "Combo - đóng gói". Hệ mới chưa mô hình hóa combo — nạp như hàng thường.`,
    });
  }

  if (tonAm > 0) {
    canhBao.push({
      rowNumber: null,
      lyDo: `${tonAm} mã đang tồn ÂM trên KiotViet. Tồn KHÔNG được nạp — chỉ để biết trước khi kiểm kê.`,
    });
  }

  for (const [gt, ds] of dvtLa) {
    canhBao.push({
      rowNumber: ds[0] ?? null,
      lyDo: `ĐVT lạ "${gt}" ở ${ds.length} dòng (dòng đầu ${ds[0]}). Tạm gán CAI / MUA_NGOAI.`,
    });
  }

  return { hopLe, loi, canhBao };
}

export function kiemTraDoiTac(dong: RawRow[], tenFile: string): KetQuaKiemTra<DoiTac> {
  const hopLe: KetQuaKiemTra<DoiTac>["hopLe"] = [];
  const loi: Loi[] = [];
  const canhBao: CanhBao[] = [];
  const daThay = new Map<string, number>();
  let soThuTu = 900_000; // mã sinh cho NCC bị ghi nhầm MST vào ô mã — dải riêng, không đụng mã thật

  for (const d of dong) {
    let ma = readString(d.cells["ma_nha_cung_cap"]);
    let mst = readString(d.cells["ma_so_thue"]);
    const ten = readString(d.cells["ten_nha_cung_cap"]);

    if (ma && NCC_AO.has(ma)) {
      canhBao.push({ rowNumber: d.rowNumber, lyDo: `Bỏ qua NCC ảo ${ma} "${ten}": ${NCC_AO.get(ma)}.` });
      continue;
    }

    // Dữ liệu thật: "0317415317" nằm ở ô MÃ nhà cung cấp — là mã số thuế.
    if (ma && /^\d{10,13}$/.test(ma)) {
      mst = mst ?? ma;
      soThuTu++;
      const maMoi = `NCC${soThuTu}`;
      canhBao.push({
        rowNumber: d.rowNumber,
        lyDo: `Ô mã chứa mã số thuế (${ma}) — chuyển sang ma_so_thue, sinh mã mới ${maMoi}. Phiếu nhập cũ tham chiếu mã ${ma} vẫn tra được trong bảng lưu trữ.`,
      });
      ma = maMoi;
    }

    const tho = {
      ma,
      ten,
      dien_thoai: readString(d.cells["dien_thoai"]),
      email: readString(d.cells["email"]),
      dia_chi: readString(d.cells["dia_chi"]),
      khu_vuc: readString(d.cells["khu_vuc"]),
      phuong_xa: readString(d.cells["phuong_xa"]),
      ma_so_thue: mst,
      ghi_chu: readString(d.cells["ghi_chu"]),
    };

    const kq = DoiTacSchema.safeParse(tho);
    if (!kq.success) {
      ghiLoi(loi, d.rowNumber, kq, tho);
      continue;
    }

    const truoc = daThay.get(kq.data.ma);
    if (truoc !== undefined) {
      canhBao.push({ rowNumber: d.rowNumber, lyDo: `Trùng mã đối tác "${kq.data.ma}" với dòng ${truoc}.` });
    }
    daThay.set(kq.data.ma, d.rowNumber);
    hopLe.push({ rowNumber: d.rowNumber, duLieu: kq.data, duLieuGoc: d.cells });
  }

  const kyVong = SO_DONG_KY_VONG[tenFile];
  if (kyVong && dong.length !== kyVong) {
    canhBao.push({ rowNumber: null, lyDo: `Đọc được ${dong.length} dòng, PROJECT.md ghi ${kyVong}.` });
  }

  return { hopLe, loi, canhBao };
}
