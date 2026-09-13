/**
 * Tách ô ĐVT của KiotViet thành hai khái niệm độc lập.
 *
 * Trường ĐVT của hệ cũ chứa lẫn đơn vị tính và công đoạn xử lý bề mặt.
 * Phân bố thật trong 3.266 mã:
 *
 *   CÁI 1.571 · CARBON 518 · SƠN 394 · XI MẠ 278 · ÉP 230
 *   CẶP 148 · BỘ 42 · CHAI 22 · NANO 20
 *
 * Bốn giá trị in đậm ở giữa không phải đơn vị tính — đó là công đoạn.
 * Hệ quả trên hệ cũ: không trả lời được "hàng sơn tồn bao nhiêu" và
 * "một cặp là mấy cái" cùng lúc.
 */

/**
 * CHỈ dùng làm gợi ý khi file KHÔNG có cột "Quy đổi". File export KiotViet thật
 * CÓ cột này (giá trị 1 cho cả 148 mã CẶP), và nap-du-lieu.ts nạp đúng số trong
 * file. Đổi hằng số này KHÔNG ảnh hưởng tới dữ liệu đã nạp.
 */
export const QUY_DOI_CAP = 2;

const CONG_DOAN = new Map<string, string>([
  ["EP", "EP"],
  ["SON", "SON"],
  ["CARBON", "CARBON"],
  ["XI MA", "XI_MA"],
  ["XIMA", "XI_MA"],
  ["NANO", "NANO"],
]);

const DON_VI_TINH = new Map<string, string>([
  ["CAI", "CAI"],
  ["CAP", "CAP"],
  ["BO", "BO"],
  ["CHAI", "CHAI"],
  ["BICH", "BICH"],
  ["LON", "LON"],
  ["PC", "PC"],
]);

export function chuanHoa(v: string | null | undefined): string {
  if (!v) return "";
  return v
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();
}

export type KetQuaTach = {
  maDvt: string;
  maCongDoan: string;
  quyDoi: number;
  /** false = công đoạn chỉ là mặc định tạm, CẦN người rà lại. */
  suyDuoc: boolean;
  /** Giá trị gốc không nhận ra, để báo cáo liệt kê. */
  giaTriLa?: string;
};

export function tachDvtCongDoan(dvtGoc: string | null | undefined): KetQuaTach {
  const chuan = chuanHoa(dvtGoc);

  const congDoan = CONG_DOAN.get(chuan);
  if (congDoan) {
    // Hàng qua xử lý bề mặt đếm theo cái. Công đoạn suy được chắc chắn.
    return { maDvt: "CAI", maCongDoan: congDoan, quyDoi: 1, suyDuoc: true };
  }

  const dvt = DON_VI_TINH.get(chuan);
  if (dvt) {
    // Biết đơn vị tính nhưng KHÔNG biết công đoạn. MUA_NGOAI chỉ là mặc định
    // tạm để không chặn việc nạp — 1.571 mã "CÁI" rơi vào nhánh này.
    return {
      maDvt: dvt,
      maCongDoan: "MUA_NGOAI",
      quyDoi: dvt === "CAP" ? QUY_DOI_CAP : 1,
      suyDuoc: false,
    };
  }

  return {
    maDvt: "CAI",
    maCongDoan: "MUA_NGOAI",
    quyDoi: 1,
    suyDuoc: false,
    giaTriLa: chuan || "(rỗng)",
  };
}
