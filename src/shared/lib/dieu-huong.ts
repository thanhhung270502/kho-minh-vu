// File thuần — không đánh dấu client, không import thư viện UI nào cả.
// Icon để dạng mã chuỗi (MaIcon), ánh xạ sang element ở icon-dieu-huong.tsx
// (file client) — cách chắc chắn để Server Component vẫn import được từ đây.
import { coQuyen, type Quyen, type VaiTro } from "@/shared/lib/quyen";

export type MaIcon = "tong-quan" | "danh-muc" | "doi-tac" | "cai-dat";

export type MucDieuHuong = {
  duongDan: string;
  nhan: string;
  /** Nhãn ngắn cho thanh tab đáy — chỗ hẹp, tối đa ~8 ký tự. */
  nhanNgan: string;
  icon: MaIcon;
  quyen: Quyen;
  /** null = không vào thanh tab đáy, nằm trong mục "Khác". */
  uuTienMobile: number | null;
};

export const MUC_DIEU_HUONG: MucDieuHuong[] = [
  {
    duongDan: "/",
    nhan: "Tổng quan",
    nhanNgan: "Tổng quan",
    icon: "tong-quan",
    quyen: "xem_danh_muc",
    uuTienMobile: 1,
  },
  {
    duongDan: "/danh-muc",
    nhan: "Danh mục hàng",
    nhanNgan: "Hàng",
    icon: "danh-muc",
    quyen: "xem_danh_muc",
    uuTienMobile: 2,
  },
  {
    duongDan: "/doi-tac",
    nhan: "Đối tác",
    nhanNgan: "Đối tác",
    icon: "doi-tac",
    quyen: "xem_danh_muc",
    uuTienMobile: 3,
  },
  {
    duongDan: "/cai-dat",
    nhan: "Cài đặt",
    nhanNgan: "Cài đặt",
    icon: "cai-dat",
    quyen: "cai_dat_danh_muc_phu",
    // Thủ kho hiếm dùng, đẩy vào "Khác" thay vì chiếm một ô của thanh tab đáy.
    uuTienMobile: null,
  },
];

/** "/" chỉ khớp chính nó; các mục khác khớp cả route con. */
export function timMucDangMo(pathname: string, muc: MucDieuHuong[]): string {
  const khop = muc.filter(
    (m) => m.duongDan !== "/" && pathname.startsWith(m.duongDan),
  );

  return khop.at(-1)?.duongDan ?? "/";
}

/** D-07: menu chỉ hiện mục vai trò có quyền — ẩn hẳn, không chỉ disable. */
export function locTheoQuyen(
  vaiTro: VaiTro,
  muc: MucDieuHuong[],
): MucDieuHuong[] {
  return muc.filter((m) => coQuyen(vaiTro, m.quyen));
}

/**
 * Tách mục cho thanh tab đáy: tối đa 4 ô chính (sắp theo uuTienMobile tăng
 * dần), phần còn lại — kể cả mục bị cắt vì quá 4 — rơi vào "Khác".
 */
export function tachMucMobile(muc: MucDieuHuong[]): {
  chinh: MucDieuHuong[];
  khac: MucDieuHuong[];
} {
  const uuTien = muc
    .filter((m) => m.uuTienMobile !== null)
    .sort((a, b) => (a.uuTienMobile as number) - (b.uuTienMobile as number));

  const chinh = uuTien.slice(0, 4);
  const chinhSet = new Set(chinh.map((m) => m.duongDan));
  const khac = muc.filter((m) => !chinhSet.has(m.duongDan));

  return { chinh, khac };
}

/**
 * Tailwind không sinh được class động `grid-cols-${n}` — thanh tab đáy dùng
 * số này để đặt `style={{ gridTemplateColumns: repeat(n, minmax(0,1fr)) }}`.
 */
export function soCotTabDay(chinh: MucDieuHuong[], khac: MucDieuHuong[]): number {
  return chinh.length + (khac.length > 0 ? 1 : 0);
}
