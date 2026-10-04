// File thuần (bẫy 9): form mã hàng, job đồng bộ và scripts/test-*.ts cùng import.
//
// Chuyển NGUYÊN VĂN công thức sheet TRA_CUU (file "Tra_cuu_ma_hang") sang
// TypeScript — mỗi bước ghi tên cột sheet tương ứng để đối chiếu khi bên làm
// mã đổi quy tắc. Đã đối chiếu 3.311 mã thật: 4 trường trùng 100%
// (scripts/test-product-codes.ts).
//
// Quy tắc: [Mã hãng][Mã dòng][Đời 2 số] - [Mã linh kiện][Mã màu] - [đoạn phụ…] - [Mã xử lý]

/** Một dòng sheet "Quy chuẩn mã" (10 cột: 5 cặp tên + mã hóa). */
export type CodeSourceRow = {
  brand: string;
  brandCode: string;
  model: string;
  modelCode: string;
  part: string;
  partCode: string;
  finish: string;
  finishCode: string;
  color: string;
  colorCode: string;
};

type BrandModel = { brand: string; brandCode: string; model: string; modelCode: string };

export type CodeDictionary = {
  /** Khóa = mã hãng + mã dòng NẰM CÙNG MỘT DÒNG sheet (cột "Khóa hãng+dòng" của CHUAN). */
  pairs: Map<string, BrandModel>;
  /** Mã hãng đứng một mình (mã không ghi dòng xe). */
  brands: Map<string, string>;
  parts: Map<string, string>;
  finishes: Map<string, string>;
  colors: Set<string>;
};

/** MATCH(…, 0) của Google Sheets không phân biệt hoa thường — so khớp trên chữ hoa. */
const key = (value: string) => value.trim().toUpperCase();

export function buildCodeDictionary(rows: ReadonlyArray<CodeSourceRow>): CodeDictionary {
  const dict: CodeDictionary = {
    pairs: new Map(),
    brands: new Map(),
    parts: new Map(),
    finishes: new Map(),
    colors: new Set(),
  };
  // MATCH trả dòng ĐẦU TIÊN khớp — giữ giá trị gặp trước, không ghi đè.
  for (const r of rows) {
    const brandCode = r.brandCode.trim();
    const modelCode = r.modelCode.trim();
    if (brandCode && modelCode && !dict.pairs.has(key(brandCode + modelCode))) {
      dict.pairs.set(key(brandCode + modelCode), {
        brand: r.brand.trim(),
        brandCode,
        model: r.model.trim(),
        modelCode,
      });
    }
    if (brandCode && !dict.brands.has(key(brandCode))) dict.brands.set(key(brandCode), r.brand.trim());
    // CHUAN dùng TRIM() riêng cho tên linh kiện (gộp khoảng trắng thừa).
    if (r.partCode.trim() && !dict.parts.has(key(r.partCode))) {
      dict.parts.set(key(r.partCode), r.part.trim().replace(/\s+/g, " "));
    }
    if (r.finishCode.trim() && !dict.finishes.has(key(r.finishCode))) {
      dict.finishes.set(key(r.finishCode), r.finish.trim());
    }
    if (r.colorCode.trim()) dict.colors.add(key(r.colorCode));
  }
  return dict;
}

export type CodeField = "code" | "brand" | "model" | "part" | "finish";

export type ParsedProductCode = {
  /** Mã đã chuẩn hóa (TRIM + chữ hoa) — cột G. */
  normalized: string;
  brand: string;
  brandCode: string;
  model: string;
  modelCode: string;
  part: string;
  partCode: string;
  finish: string;
  finishCode: string;
  /** Xử lý lấy từ cả đoạn cuối hay từ ký tự cuối (cột P). */
  finishFrom: "segment" | "suffix" | null;
  status: "ok" | "invalid";
  /** Đoạn nào lệch — giao diện tô đúng ô. */
  issues: Array<{ field: CodeField; message: string }>;
  /** Câu "Ghi chú" y như cột F của sheet. */
  note: string;
};

const NO_DASH = "Mã không theo quy chuẩn (không có dấu -)";

/**
 * `ISNUMBER(--RIGHT(H, 2))` của Sheets: ép chuỗi sang số — ".4", "1." cũng là số
 * (đã gặp thật: "N1.4-6.3UNI"). Number() của JS ép giống vậy với 2 ký tự.
 */
function isSheetNumber(text: string): boolean {
  return text.trim() !== "" && Number.isFinite(Number(text));
}

export function parseProductCode(input: string, dict: CodeDictionary): ParsedProductCode {
  const g = key(input); // G: Mã chuẩn hóa
  const dashes = g.length - g.replaceAll("-", "").length; // N: Số dấu -
  const h = dashes < 1 ? "" : g.slice(0, g.indexOf("-")); // H: Đoạn 1
  const o = g.slice(g.lastIndexOf("-") + 1).trim(); // O: Đoạn cuối

  // I: Khóa hãng+dòng — đoạn 1 khớp thẳng, không thì bỏ "đời" 2 ký tự cuối nếu là số.
  let i = "";
  if (h) i = dict.pairs.has(h) || dict.brands.has(h) ? h : isSheetNumber(h.slice(-2)) ? h.slice(0, -2) : h;

  // L: Mã xử lý — cả đoạn cuối (mã ≥ 2 dấu -) hoặc đuôi dài nhất 4 → 1 ký tự.
  let l = "";
  let finishFrom: ParsedProductCode["finishFrom"] = null;
  if (h) {
    if (dashes >= 2 && dict.finishes.has(o)) {
      l = o;
    } else {
      for (const len of [4, 3, 2, 1]) {
        if (o.length > len && dict.finishes.has(o.slice(-len))) {
          l = o.slice(-len);
          break;
        }
      }
    }
    if (l) finishFrom = dashes >= 2 && l === o ? "segment" : "suffix";
  }

  // J: Phần linh kiện + màu — đoạn 2 (mã ≥ 2 dấu -) hoặc đoạn cuối bỏ mã xử lý.
  let j = "";
  if (h) {
    if (dashes >= 2) {
      const start = h.length + 1;
      j = g.slice(start, g.indexOf("-", start));
    } else {
      j = l === "" ? o : o.slice(0, o.length - l.length);
    }
  }

  // K: Mã linh kiện — dài nhất 6 → 1 ký tự mà phần còn lại là mã màu hoặc rỗng.
  let k = "";
  for (const len of [6, 5, 4, 3, 2, 1]) {
    if (j.length >= len && dict.parts.has(j.slice(0, len)) && (j.length === len || dict.colors.has(j.slice(len)))) {
      k = j.slice(0, len);
      break;
    }
  }

  const pair = i ? dict.pairs.get(i) : undefined;
  const brand = i ? (pair?.brand ?? dict.brands.get(i) ?? "") : ""; // B
  const model = pair?.model ?? ""; // C
  const part = k ? (dict.parts.get(k) ?? "") : ""; // D
  const finish = l ? (dict.finishes.get(l) ?? "") : ""; // E

  // M: Lỗi — đúng thứ tự và câu chữ của sheet.
  const issues: ParsedProductCode["issues"] = [];
  if (!h) {
    if (g) issues.push({ field: "code", message: NO_DASH });
  } else {
    if (!brand) issues.push({ field: "brand", message: `Hãng/dòng [${i}] không có trong quy chuẩn.` });
    if (brand && !model) issues.push({ field: "model", message: "Mã không ghi dòng xe." });
    if (!k) issues.push({ field: "part", message: `Phần [${j}] không tách được linh kiện+màu.` });
    if (!finish) issues.push({ field: "finish", message: `Không tìm được mã xử lý trong [${o}].` });
  }

  // F: Ghi chú
  let note = "";
  if (g) {
    if (!h) note = NO_DASH;
    else if (issues.length > 0) note = issues.map((x) => x.message).join(" ");
    else note = finishFrom === "suffix" ? `OK (xử lý lấy từ ký tự cuối [${l}])` : "OK";
  }

  return {
    normalized: g,
    brand,
    brandCode: pair?.brandCode ?? (brand ? i : ""),
    model,
    modelCode: pair?.modelCode ?? "",
    part,
    partCode: k,
    finish,
    finishCode: l,
    finishFrom,
    status: issues.length === 0 && g !== "" ? "ok" : "invalid",
    issues,
    note,
  };
}
