// File thuần: chuyển giữa dòng sheet "Quy chuẩn mã" và bảng ma_hoa (0085).
import { buildCodeDictionary, type CodeDictionary, type CodeSourceRow } from "./parse-product-code";

export type CodeKind = "hang" | "dong" | "linh_kien" | "xu_ly" | "mau";

/**
 * Một mục bảng ma_hoa. Khóa snake_case tiếng Việt CÓ CHỦ ĐÍCH: hợp đồng jsonb
 * gửi thẳng cho RPC dong_bo_ma_hoa và cột đọc về từ bảng.
 */
export type CodeEntry = {
  loai: CodeKind;
  ma: string;
  ten: string;
  ma_hang: string | null;
  thu_tu: number;
};

const upper = (v: string) => v.trim().toUpperCase();

/** Mỗi (loại, mã) chỉ giữ lần xuất hiện ĐẦU TIÊN — MATCH của Sheets cũng lấy dòng đầu. */
export function toSyncEntries(rows: ReadonlyArray<CodeSourceRow>): CodeEntry[] {
  const seen = new Set<string>();
  const entries: CodeEntry[] = [];
  const push = (loai: CodeKind, ma: string, ten: string, order: number, maHang: string | null = null) => {
    const code = ma.trim();
    if (!code) return;
    const id = `${loai}|${upper(maHang ?? "")}|${upper(code)}`;
    if (seen.has(id)) return;
    seen.add(id);
    entries.push({ loai, ma: code, ten: ten.trim().replace(/\s+/g, " "), ma_hang: maHang, thu_tu: order });
  };

  rows.forEach((r, index) => {
    const order = index + 1;
    push("hang", r.brandCode, r.brand, order);
    // Cặp hãng+dòng chỉ khi CẢ HAI mã nằm cùng dòng sheet (cột khóa của CHUAN).
    if (r.brandCode.trim() && r.modelCode.trim()) push("dong", r.modelCode, r.model, order, r.brandCode.trim());
    push("linh_kien", r.partCode, r.part, order);
    push("xu_ly", r.finishCode, r.finish, order);
    push("mau", r.colorCode, r.color, order);
  });
  return entries;
}

/** Dựng từ điển tách mã từ các mục đọc về từ bảng ma_hoa. */
export function dictionaryFromEntries(entries: ReadonlyArray<CodeEntry>): CodeDictionary {
  const brandName = new Map<string, string>();
  for (const e of entries) if (e.loai === "hang" && !brandName.has(upper(e.ma))) brandName.set(upper(e.ma), e.ten);

  const blank: CodeSourceRow = {
    brand: "", brandCode: "", model: "", modelCode: "", part: "", partCode: "",
    finish: "", finishCode: "", color: "", colorCode: "",
  };
  const rows = [...entries]
    .sort((a, b) => a.thu_tu - b.thu_tu)
    .map((e): CodeSourceRow => {
      switch (e.loai) {
        case "hang":
          return { ...blank, brand: e.ten, brandCode: e.ma };
        case "dong":
          return {
            ...blank,
            brand: brandName.get(upper(e.ma_hang ?? "")) ?? "",
            brandCode: e.ma_hang ?? "",
            model: e.ten,
            modelCode: e.ma,
          };
        case "linh_kien":
          return { ...blank, part: e.ten, partCode: e.ma };
        case "xu_ly":
          return { ...blank, finish: e.ten, finishCode: e.ma };
        case "mau":
          return { ...blank, color: e.ten, colorCode: e.ma };
      }
    });
  return buildCodeDictionary(rows);
}
