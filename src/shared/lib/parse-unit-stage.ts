import { removeDiacritics } from "./text";

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
 * CÓ cột này (giá trị 1 cho cả 148 mã CẶP), và load-data.ts nạp đúng số trong
 * file. Đổi hằng số này KHÔNG ảnh hưởng tới dữ liệu đã nạp.
 */
export const PAIR_CONVERSION = 2;

/** Khóa và giá trị là mã trong database — không dịch. */
const STAGE_CODES = new Map<string, string>([
  ["EP", "EP"],
  ["SON", "SON"],
  ["CARBON", "CARBON"],
  ["XI MA", "XI_MA"],
  ["XIMA", "XI_MA"],
  ["NANO", "NANO"],
]);

const UNIT_CODES = new Map<string, string>([
  ["CAI", "CAI"],
  ["CAP", "CAP"],
  ["BO", "BO"],
  ["CHAI", "CHAI"],
  ["BICH", "BICH"],
  ["LON", "LON"],
  ["PC", "PC"],
]);

export function normalizeCode(value: string | null | undefined): string {
  if (!value) return "";
  return removeDiacritics(value).toUpperCase().replace(/\s+/g, " ").trim();
}

export type UnitStageSplit = {
  unitCode: string;
  stageCode: string;
  conversion: number;
  /** false = công đoạn chỉ là mặc định tạm, CẦN người rà lại. */
  inferred: boolean;
  /** Giá trị gốc không nhận ra, để báo cáo liệt kê. */
  unknownValue?: string;
};

export function splitUnitStage(rawUnit: string | null | undefined): UnitStageSplit {
  const normalized = normalizeCode(rawUnit);

  const stage = STAGE_CODES.get(normalized);
  if (stage) {
    // Hàng qua xử lý bề mặt đếm theo cái. Công đoạn suy được chắc chắn.
    return { unitCode: "CAI", stageCode: stage, conversion: 1, inferred: true };
  }

  const unit = UNIT_CODES.get(normalized);
  if (unit) {
    // Biết đơn vị tính nhưng KHÔNG biết công đoạn. MUA_NGOAI chỉ là mặc định
    // tạm để không chặn việc nạp — 1.571 mã "CÁI" rơi vào nhánh này.
    return {
      unitCode: unit,
      stageCode: "MUA_NGOAI",
      conversion: unit === "CAP" ? PAIR_CONVERSION : 1,
      inferred: false,
    };
  }

  return {
    unitCode: "CAI",
    stageCode: "MUA_NGOAI",
    conversion: 1,
    inferred: false,
    unknownValue: normalized || "(rỗng)",
  };
}
