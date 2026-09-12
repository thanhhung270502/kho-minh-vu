/**
 * Ghi danh mục vào database qua RPC `nap_danh_muc_kiotviet`.
 *
 * Gọi MỘT rpc() thay vì nhiều lệnh rời rạc: supabase-js không mở transaction
 * nhiều lệnh được, nên toàn bộ upsert phải nằm trong một hàm Postgres để đạt
 * "toàn bộ hoặc không gì cả". Đây cũng chính là nguyên tắc đã áp cho ghi sổ —
 * không có lý do gì nới lỏng ở đây.
 */
import { taoAdminClient } from "../_supabase-admin";
import { tachDvtCongDoan } from "./tach-dvt-cong-doan";
import type { DoiTac, SanPham } from "./kiem-tra";

export type DauVaoNap = {
  sanPham: Array<{ duLieu: SanPham; duLieuGoc: Record<string, unknown> }>;
  doiTac: Array<{ duLieu: DoiTac; duLieuGoc: Record<string, unknown> }>;
};

export type KetQuaNap = {
  nhom_hang: number;
  don_vi_tinh: number;
  cong_doan: number;
  doi_tac: number;
  san_pham: number;
};

/** "NẠ - 75" → { ma: "75", ten: "NẠ" }. Không tách được thì dùng slug của tên. */
export function tachMaNhomHang(ten: string): { ma: string; ten: string } {
  const m = ten.match(/^(.+?)\s*-\s*(\S+)$/);
  if (m && m[2] && m[1]) return { ma: m[2].trim(), ten: m[1].trim() };
  return {
    ma: ten.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Za-z0-9]+/g, "_").toUpperCase().slice(0, 40),
    ten,
  };
}

export async function napDuLieu(dauVao: DauVaoNap): Promise<KetQuaNap> {
  const supabase = taoAdminClient();

  const nhomTheoTen = new Map<string, { ma: string; ten: string }>();
  for (const sp of dauVao.sanPham) {
    const ten = sp.duLieu.ten_nhom_hang;
    if (ten && !nhomTheoTen.has(ten)) nhomTheoTen.set(ten, tachMaNhomHang(ten));
  }

  const payload = {
    nhom_hang: [...nhomTheoTen.values()],
    don_vi_tinh: [] as Array<{ ma: string; ten: string }>,
    cong_doan: [] as Array<{ ma: string; ten: string }>,
    doi_tac: dauVao.doiTac.map((d) => ({
      ma: d.duLieu.ma,
      ten: d.duLieu.ten,
      loai: "NCC",
      dien_thoai: d.duLieu.dien_thoai,
      email: d.duLieu.email,
      dia_chi: d.duLieu.dia_chi,
      khu_vuc: null,
      phuong_xa: null,
      ma_so_thue: d.duLieu.ma_so_thue,
      ghi_chu: d.duLieu.ghi_chu,
    })),
    san_pham: dauVao.sanPham.map((s) => {
      const tach = tachDvtCongDoan(s.duLieu.dvt_goc);
      const nhom = s.duLieu.ten_nhom_hang ? nhomTheoTen.get(s.duLieu.ten_nhom_hang) : null;
      return {
        ma_hang: s.duLieu.ma_hang,
        ten_hang: s.duLieu.ten_hang,
        barcode: s.duLieu.barcode,
        ma_nhom_hang: nhom?.ma ?? null,
        ma_dvt: tach.maDvt,
        ma_cong_doan: tach.maCongDoan,
        quy_doi: tach.quyDoi,
        gia_ban: s.duLieu.gia_ban ?? 0,
        ton_toi_thieu: s.duLieu.ton_toi_thieu ?? 0,
        ghi_chu: s.duLieu.ghi_chu,
        // ton_kiotviet CỐ Ý không gửi lên. Tồn đầu kỳ set từ kiểm kê thực tế ở
        // Phase 6 — tồn khởi điểm sai thì cả hệ thống sai từ ngày đầu.
        // gia_von cũng không gửi: chỉ trigger giá vốn ghi cột đó.
      };
    }),
  };

  const { data, error } = await supabase.rpc("nap_danh_muc_kiotviet", { p_du_lieu: payload });
  if (error) throw error;
  return data as unknown as KetQuaNap;
}

/** Lưu trữ chứng từ cũ để tra cứu. Không nạp vào chung_tu. */
export async function napLuuTru(
  bang: "luu_tru_nhap_kiotviet" | "luu_tru_hoa_don_kiotviet",
  dong: Array<{ duLieuGoc: Record<string, unknown> }>,
): Promise<number> {
  const supabase = taoAdminClient();
  if (dong.length === 0) return 0;

  // Xoá rồi nạp lại: bảng lưu trữ không có khóa nghiệp vụ để upsert, và đây là
  // ảnh chụp một lần của file export chứ không phải dữ liệu sống.
  const { error: loiXoa } = await supabase.from(bang).delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (loiXoa) throw loiXoa;

  const LO = 500;
  let tong = 0;
  for (let i = 0; i < dong.length; i += LO) {
    const lo = dong.slice(i, i + LO).map((d) => ({ du_lieu_goc: d.duLieuGoc as never }));
    const { error } = await supabase.from(bang).insert(lo);
    if (error) throw error;
    tong += lo.length;
  }
  return tong;
}
