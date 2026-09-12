/**
 * Validate từng dòng và GOM HẾT LỖI, không dừng ở lỗi đầu tiên.
 *
 * Đây là toàn bộ giá trị của chế độ thử: người dùng sửa một lượt thay vì chạy
 * lại bốn mươi lần.
 */
import { z } from "zod";

import { doChuoi, doSo, type DongTho } from "./doc-file";
import { tachDvtCongDoan } from "./tach-dvt-cong-doan";

export type Loi = { soDong: number; truong: string; lyDo: string; giaTri: unknown };
export type CanhBao = { soDong: number | null; lyDo: string };

export type KetQuaKiemTra<T> = {
  hopLe: Array<{ soDong: number; duLieu: T; duLieuGoc: Record<string, unknown> }>;
  loi: Loi[];
  canhBao: CanhBao[];
};

/** Số dòng kỳ vọng, lấy từ PROJECT.md. Lệch thì cảnh báo chứ không coi là lỗi. */
export const SO_DONG_KY_VONG: Record<string, number> = {
  "DanhSachSanPham": 3266,
  "DanhSachNhaCungCap": 25,
  "ChiTietNhapHang": 594,
  "ChiTietHoaDon": 4732,
};

export const SanPhamSchema = z.object({
  ma_hang: z.string().min(1, "Thiếu mã hàng"),
  ten_hang: z.string().min(1, "Thiếu tên hàng"),
  barcode: z.string().nullable(),
  ten_nhom_hang: z.string().nullable(),
  dvt_goc: z.string().nullable(),
  gia_ban: z.number().nonnegative("Giá bán không được âm").nullable(),
  ton_toi_thieu: z.number().nonnegative().nullable(),
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
  ma_so_thue: z.string().nullable(),
  ghi_chu: z.string().nullable(),
});
export type DoiTac = z.infer<typeof DoiTacSchema>;

function lay(o: Record<string, unknown>, ...khoa: string[]): unknown {
  for (const k of khoa) if (k in o) return o[k];
  return null;
}

export function kiemTraSanPham(dong: DongTho[], tenFile: string): KetQuaKiemTra<SanPham> {
  const hopLe: KetQuaKiemTra<SanPham>["hopLe"] = [];
  const loi: Loi[] = [];
  const canhBao: CanhBao[] = [];

  const daThay = new Map<string, number>();
  const dvtLa = new Map<string, number[]>();
  let chuaSuyDuocCongDoan = 0;
  let soCap = 0;

  for (const d of dong) {
    const tho = {
      ma_hang: doChuoi(lay(d.o, "ma_hang", "ma", "ma_hang_hoa")),
      ten_hang: doChuoi(lay(d.o, "ten_hang", "ten", "ten_hang_hoa")),
      barcode: doChuoi(lay(d.o, "barcode", "ma_vach")),
      ten_nhom_hang: doChuoi(lay(d.o, "nhom_hang", "ten_nhom_hang", "nhom")),
      dvt_goc: doChuoi(lay(d.o, "dvt", "don_vi_tinh", "dvt_goc")),
      gia_ban: doSo(lay(d.o, "gia_ban", "gia")),
      ton_toi_thieu: doSo(lay(d.o, "ton_toi_thieu", "dinh_muc_toi_thieu")),
      ton_kiotviet: doSo(lay(d.o, "ton_kho", "ton", "so_luong_ton")),
      ghi_chu: doChuoi(lay(d.o, "ghi_chu", "mo_ta")),
    };

    const kq = SanPhamSchema.safeParse(tho);
    if (!kq.success) {
      for (const issue of kq.error.issues) {
        loi.push({
          soDong: d.soDong,
          truong: issue.path.join(".") || "(dòng)",
          lyDo: issue.message,
          giaTri: tho[issue.path[0] as keyof typeof tho],
        });
      }
      continue;
    }

    const truoc = daThay.get(kq.data.ma_hang);
    if (truoc !== undefined) {
      canhBao.push({
        soDong: d.soDong,
        lyDo: `Trùng mã hàng "${kq.data.ma_hang}" — đã xuất hiện ở dòng ${truoc}. Dòng sau ghi đè dòng trước.`,
      });
    }
    daThay.set(kq.data.ma_hang, d.soDong);

    const tach = tachDvtCongDoan(kq.data.dvt_goc);
    if (!tach.suyDuoc) chuaSuyDuocCongDoan++;
    if (tach.maDvt === "CAP") soCap++;
    if (tach.giaTriLa) {
      const ds = dvtLa.get(tach.giaTriLa) ?? [];
      ds.push(d.soDong);
      dvtLa.set(tach.giaTriLa, ds);
    }

    hopLe.push({ soDong: d.soDong, duLieu: kq.data, duLieuGoc: d.o });
  }

  const kyVong = SO_DONG_KY_VONG[tenFile];
  if (kyVong && dong.length !== kyVong) {
    canhBao.push({
      soDong: null,
      lyDo: `Đọc được ${dong.length} dòng, PROJECT.md ghi ${kyVong}. Có thể là file export khác kỳ — cần người xác nhận, không phải lỗi.`,
    });
  }

  if (chuaSuyDuocCongDoan > 0) {
    canhBao.push({
      soDong: null,
      lyDo: `${chuaSuyDuocCongDoan} mã chưa suy được công đoạn từ ô ĐVT cũ, tạm gán MUA_NGOAI. Cần rà theo nhóm hàng — tài liệu dự kiến con số này là 1.826.`,
    });
  }

  if (soCap > 0) {
    canhBao.push({
      soDong: null,
      lyDo: `${soCap} mã có đơn vị CẶP, script đặt quy_doi = 2. XÁC NHẬN: 1 CẶP có đúng bằng 2 CÁI không? Nếu không, sửa QUY_DOI_CAP trong tach-dvt-cong-doan.ts.`,
    });
  }

  for (const [gt, ds] of dvtLa) {
    canhBao.push({
      soDong: ds[0] ?? null,
      lyDo: `Giá trị ĐVT lạ "${gt}" ở ${ds.length} dòng (dòng đầu: ${ds[0]}). Tạm gán CAI/MUA_NGOAI.`,
    });
  }

  return { hopLe, loi, canhBao };
}

export function kiemTraDoiTac(dong: DongTho[], tenFile: string): KetQuaKiemTra<DoiTac> {
  const hopLe: KetQuaKiemTra<DoiTac>["hopLe"] = [];
  const loi: Loi[] = [];
  const canhBao: CanhBao[] = [];
  const daThay = new Map<string, number>();

  for (const d of dong) {
    let ma = doChuoi(lay(d.o, "ma_ncc", "ma", "ma_nha_cung_cap", "ma_doi_tac"));
    let mst = doChuoi(lay(d.o, "ma_so_thue", "mst"));

    // Dữ liệu thật lẫn NCC000023 với mã số thuế 0317415317 ở cùng cột.
    // Toàn số và dài 10-13 ký tự thì coi là mã số thuế.
    if (ma && /^\d{10,13}$/.test(ma)) {
      mst = mst ?? ma;
      ma = null;
      canhBao.push({
        soDong: d.soDong,
        lyDo: `Cột mã chứa mã số thuế (${mst}) thay vì mã NCC. Script sẽ sinh mã tuần tự NCC######.`,
      });
    }

    const tho = {
      ma: ma ?? `NCC${String(d.soDong).padStart(6, "0")}`,
      ten: doChuoi(lay(d.o, "ten_ncc", "ten", "ten_nha_cung_cap", "ten_doi_tac")),
      dien_thoai: doChuoi(lay(d.o, "dien_thoai", "sdt", "so_dien_thoai")),
      email: doChuoi(lay(d.o, "email")),
      dia_chi: doChuoi(lay(d.o, "dia_chi")),
      ma_so_thue: mst,
      ghi_chu: doChuoi(lay(d.o, "ghi_chu")),
    };

    const kq = DoiTacSchema.safeParse(tho);
    if (!kq.success) {
      for (const issue of kq.error.issues) {
        loi.push({
          soDong: d.soDong,
          truong: issue.path.join(".") || "(dòng)",
          lyDo: issue.message,
          giaTri: tho[issue.path[0] as keyof typeof tho],
        });
      }
      continue;
    }

    const truoc = daThay.get(kq.data.ma);
    if (truoc !== undefined) {
      canhBao.push({ soDong: d.soDong, lyDo: `Trùng mã đối tác "${kq.data.ma}" với dòng ${truoc}.` });
    }
    daThay.set(kq.data.ma, d.soDong);

    hopLe.push({ soDong: d.soDong, duLieu: kq.data, duLieuGoc: d.o });
  }

  const kyVong = SO_DONG_KY_VONG[tenFile];
  if (kyVong && dong.length !== kyVong) {
    canhBao.push({
      soDong: null,
      lyDo: `Đọc được ${dong.length} dòng, PROJECT.md ghi ${kyVong}. Lưu ý tài liệu nói có 2 NCC ảo cần bỏ.`,
    });
  }

  return { hopLe, loi, canhBao };
}
