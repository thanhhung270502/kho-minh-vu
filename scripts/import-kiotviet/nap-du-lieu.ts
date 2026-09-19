/**
 * Ghi danh mục vào database qua RPC `nap_danh_muc_kiotviet` (một transaction).
 */
import { taoAdminClient } from "../_supabase-admin";
import { readString, readExcelDate, readNumber, type RawRow } from "./doc-file";
import { normalizeCode, splitUnitStage } from "./tach-dvt-cong-doan";
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

/**
 * Mã nhóm hàng = slug của TÊN ĐẦY ĐỦ. KHÔNG tách "X - Y" thành tên–mã.
 *
 * Lý do, phát hiện trên dữ liệu thật:
 *   "Hàng Hãng - L5/6"  (1.135 mã) → tách ra mã "L5/6"
 *   "Hàng Ngoài - L5/6" (189 mã)   → tách ra mã "L5/6"   ← ĐỤNG
 *   "DÈ CON - 35" và "DÈ TRƯỚC - 35"                     ← cũng đụng
 * Upsert theo mã thì nhóm sau ghi đè nhóm trước, 1.324 sản phẩm dồn vào một
 * nhóm, âm thầm. " - " trong KiotViet lúc là tên–mã, lúc là cha–con, không nhất
 * quán nên không suy được cấu trúc. Giữ nguyên tên để không bịa dữ liệu; dựng
 * cây nhóm (parent_id) là việc làm tay ở màn Cài đặt sau.
 */
export function taoMaNhomHang(ten: string): string {
  return normalizeCode(ten).replace(/[^A-Z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "KHONG_TEN";
}

export function dungNhomHang(sanPham: DauVaoNap["sanPham"]) {
  const theoTen = new Map<string, { ma: string; ten: string }>();
  const maDaDung = new Map<string, string>(); // ma -> tên đầu tiên dùng mã đó
  const dungDo: string[] = [];

  for (const sp of sanPham) {
    const ten = sp.duLieu.ten_nhom_hang;
    if (!ten || theoTen.has(ten)) continue;

    let ma = taoMaNhomHang(ten);
    const chuTruoc = maDaDung.get(ma);
    if (chuTruoc !== undefined && chuTruoc !== ten) {
      // Hai tên khác nhau ra cùng slug (khác nhau chỉ ở dấu hoặc ký tự đặc biệt).
      let n = 2;
      while (maDaDung.has(`${ma}_${n}`)) n++;
      dungDo.push(`"${ten}" và "${chuTruoc}" cùng ra mã ${ma} → đổi thành ${ma}_${n}`);
      ma = `${ma}_${n}`;
    }
    maDaDung.set(ma, ten);
    theoTen.set(ten, { ma, ten });
  }

  return { theoTen, dungDo };
}

export async function napDuLieu(dauVao: DauVaoNap): Promise<KetQuaNap & { dungDoNhom: string[] }> {
  const supabase = taoAdminClient();
  const { theoTen, dungDo } = dungNhomHang(dauVao.sanPham);

  const payload = {
    nhom_hang: [...theoTen.values()],
    don_vi_tinh: [] as Array<{ ma: string; ten: string }>,
    cong_doan: [] as Array<{ ma: string; ten: string }>,
    doi_tac: dauVao.doiTac.map((d) => ({
      ma: d.duLieu.ma,
      ten: d.duLieu.ten,
      loai: "NCC",
      dien_thoai: d.duLieu.dien_thoai,
      email: d.duLieu.email,
      dia_chi: d.duLieu.dia_chi,
      khu_vuc: d.duLieu.khu_vuc,
      phuong_xa: d.duLieu.phuong_xa,
      ma_so_thue: d.duLieu.ma_so_thue,
      ghi_chu: d.duLieu.ghi_chu,
    })),
    san_pham: dauVao.sanPham.map((s) => {
      const tach = splitUnitStage(s.duLieu.dvt_goc);
      const nhom = s.duLieu.ten_nhom_hang ? theoTen.get(s.duLieu.ten_nhom_hang) : undefined;
      return {
        ma_hang: s.duLieu.ma_hang,
        ten_hang: s.duLieu.ten_hang,
        barcode: null,
        ma_nhom_hang: nhom?.ma ?? null,
        ma_dvt: tach.unitCode,
        ma_cong_doan: tach.stageCode,
        // Số THẬT trong file, không tự suy từ ĐVT. File ghi 1 cho cả 148 mã
        // CẶP; đặt 2 theo phỏng đoán sẽ đổi âm thầm cách tính tồn.
        quy_doi: s.duLieu.quy_doi,
        gia_ban: s.duLieu.gia_ban,
        ton_toi_thieu: s.duLieu.ton_toi_thieu,
        ton_toi_da: s.duLieu.ton_toi_da,
        // RPC đổi tên kho thành kho_mac_dinh_id (migration 0025).
        // PHẢI gửi ten_kho_mac_dinh: nếu thiếu, bước upsert ghi đè kho_mac_dinh_id
        // thành NULL trên toàn bộ sản phẩm. Không gửi vi_tri_ke nữa — RPC bỏ qua nó.
        ten_kho_mac_dinh: s.duLieu.ten_kho,
        hinh_anh_url: s.duLieu.hinh_anh_url,
        dang_kinh_doanh: s.duLieu.dang_kinh_doanh,
        ghi_chu: s.duLieu.ghi_chu,
        // KHÔNG gửi ton_kiotviet: tồn đầu kỳ set từ kiểm kê thực tế ở Phase 6.
        // KHÔNG gửi gia_von: chỉ trigger giá vốn ghi cột đó.
      };
    }),
  };

  const { data, error } = await supabase.rpc("nap_danh_muc_kiotviet", { p_du_lieu: payload });
  if (error) throw error;
  return { ...(data as unknown as KetQuaNap), dungDoNhom: dungDo };
}

/** Làm phẳng giá trị ô để jsonb gọn và đọc được, không lẫn object richText. */
function lamPhang(o: Record<string, unknown>): Record<string, string | null> {
  const ra: Record<string, string | null> = {};
  for (const [k, v] of Object.entries(o)) ra[k] = readString(v);
  return ra;
}

/**
 * Lưu trữ chứng từ cũ để tra cứu. KHÔNG nạp vào chung_tu: lịch sử cũ có đơn giá
 * bằng 0 trên mọi dòng, bê vào sổ cái sẽ làm bẩn dữ liệu từ ngày đầu.
 *
 * Xoá rồi nạp lại: bảng lưu trữ không có khóa nghiệp vụ để upsert, và đây là ảnh
 * chụp một lần của file export. Không nằm trong transaction — lỗi giữa chừng thì
 * chạy lại là đủ, vì bước xoá đầu tiên đưa bảng về rỗng.
 */
export async function napLuuTruNhap(dong: RawRow[]): Promise<number> {
  const supabase = taoAdminClient();
  const { error: loiXoa } = await supabase
    .from("luu_tru_nhap_kiotviet")
    .delete()
    .not("id", "is", null);
  if (loiXoa) throw loiXoa;

  const hang = dong.map((d) => ({
    ma_phieu: readString(d.cells["ma_nhap_hang"]),
    ngay: readExcelDate(d.cells["thoi_gian"]),
    nha_cung_cap: [readString(d.cells["ma_nha_cung_cap"]), readString(d.cells["ten_nha_cung_cap"])].filter(Boolean).join(" "),
    ma_hang: readString(d.cells["ma_hang"]),
    ten_hang: readString(d.cells["ten_hang"]),
    so_luong: readNumber(d.cells["so_luong"]),
    don_gia: null, // file chi tiết nhập hàng KHÔNG có cột đơn giá
    thanh_tien: null,
    ghi_chu: readString(d.cells["ghi_chu"]),
    du_lieu_goc: lamPhang(d.cells),
  }));
  return chenTheoLo("luu_tru_nhap_kiotviet", hang);
}

export async function napLuuTruHoaDon(dong: RawRow[]): Promise<number> {
  const supabase = taoAdminClient();
  const { error: loiXoa } = await supabase
    .from("luu_tru_hoa_don_kiotviet")
    .delete()
    .not("id", "is", null);
  if (loiXoa) throw loiXoa;

  const hang = dong.map((d) => ({
    ma_hoa_don: readString(d.cells["ma_hoa_don"]),
    ngay: readExcelDate(d.cells["thoi_gian"]),
    khach_hang: readString(d.cells["ten_khach_hang"]),
    ma_hang: readString(d.cells["ma_hang"]),
    ten_hang: readString(d.cells["ten_hang"]),
    so_luong: readNumber(d.cells["so_luong"]),
    don_gia: readNumber(d.cells["don_gia"]),
    thanh_tien: readNumber(d.cells["thanh_tien"]),
    // Tên khách hàng THẬT nằm ở đây (QUỲNH, NGỌC, TỐT...). Phase 2 (DLIEU-04)
    // quét cột này để dựng danh sách khách hàng.
    ghi_chu: readString(d.cells["ghi_chu"]),
    du_lieu_goc: lamPhang(d.cells),
  }));
  return chenTheoLo("luu_tru_hoa_don_kiotviet", hang);
}

async function chenTheoLo(
  table: "luu_tru_nhap_kiotviet" | "luu_tru_hoa_don_kiotviet",
  hang: Record<string, unknown>[],
): Promise<number> {
  const supabase = taoAdminClient();
  const LO = 500;
  let tong = 0;
  for (let i = 0; i < hang.length; i += LO) {
    const lo = hang.slice(i, i + LO);
    const { error } = await supabase.from(table).insert(lo as never);
    if (error) throw error;
    tong += lo.length;
  }
  return tong;
}
