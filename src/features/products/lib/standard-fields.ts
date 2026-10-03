// File thuần: gõ mã → tự điền Hãng xe / Dòng xe / Linh kiện / Xử lý (quy chuẩn mã, phần A).
import type { CodeDictionary, ParsedProductCode } from "@/features/product-codes/lib/parse-product-code";

/**
 * Tên trường quy chuẩn — giá trị CHECK của san_pham.truong_chon_tay (0087),
 * hợp đồng với database nên giữ tiếng Việt.
 */
export type StandardFieldKey = "hang_xe" | "dong_xe" | "linh_kien" | "xu_ly";

export const STANDARD_FIELD_LABELS: Record<StandardFieldKey, string> = {
  hang_xe: "Hãng xe",
  dong_xe: "Dòng xe",
  linh_kien: "Linh kiện",
  xu_ly: "Xử lý",
};

export type StandardValues = {
  brandCode: string | null;
  modelCode: string | null;
  partCode: string | null;
  /** Xử lý = công đoạn (bắt buộc) — id công đoạn. */
  stageId: string;
  manualFields: string[];
};

export type StageStandard = { id: string; standardCode: string | null };

/**
 * Áp kết quả tách mã lên 4 ô: ô CHỌN TAY giữ nguyên, ô còn lại đi theo mã.
 * Riêng xử lý (cột bắt buộc): mã không tách được thì về `fallbackStageId`
 * (Mua ngoài — ngoài quy chuẩn), không giữ xử lý tự điền của mã gõ trước.
 */
export function applyCodeToStandardFields(
  parsed: ParsedProductCode,
  current: StandardValues,
  stages: ReadonlyArray<StageStandard>,
  fallbackStageId: string,
): StandardValues & { autoFields: StandardFieldKey[] } {
  const manual = new Set(current.manualFields);
  const autoFields: StandardFieldKey[] = [];
  const pick = (key: StandardFieldKey, parsedValue: string, currentValue: string | null) => {
    if (manual.has(key)) return currentValue;
    if (parsedValue) autoFields.push(key);
    return parsedValue || null;
  };

  const brandCode = pick("hang_xe", parsed.brandCode, current.brandCode);
  const modelCode = pick("dong_xe", parsed.modelCode, current.modelCode);
  const partCode = pick("linh_kien", parsed.partCode, current.partCode);

  let stageId = current.stageId;
  if (!manual.has("xu_ly")) {
    const stage = parsed.finishCode
      ? stages.find((s) => s.standardCode?.toUpperCase() === parsed.finishCode.toUpperCase())
      : undefined;
    if (stage) {
      stageId = stage.id;
      autoFields.push("xu_ly");
    } else if (stages.find((s) => s.id === current.stageId)?.standardCode) {
      // Đang là xử lý quy chuẩn (tự điền từ mã trước) mà mã mới không có → về mặc định.
      stageId = fallbackStageId || current.stageId;
    }
  }

  return { brandCode, modelCode, partCode, stageId, manualFields: current.manualFields, autoFields };
}

export function toggleManual(fields: ReadonlyArray<string>, key: StandardFieldKey, manual: boolean): string[] {
  const rest = fields.filter((f) => f !== key);
  return manual ? [...rest, key] : rest;
}

/**
 * Tên hãng / dòng / linh kiện của một mã đã lưu — tra bộ mã hóa như MATCH của
 * sheet (không phân biệt hoa thường). Dòng xe tra theo CẶP hãng + dòng vì cùng
 * mã dòng có thể thuộc nhiều hãng. Không tra được → null, giao diện hiện mã.
 */
export function standardNames(
  dictionary: CodeDictionary,
  codes: { brandCode: string | null; modelCode: string | null; partCode: string | null },
): { brandName: string | null; modelName: string | null; partName: string | null } {
  const upper = (value: string) => value.trim().toUpperCase();
  return {
    brandName: codes.brandCode ? (dictionary.brands.get(upper(codes.brandCode)) ?? null) : null,
    modelName:
      codes.brandCode && codes.modelCode
        ? (dictionary.pairs.get(upper(codes.brandCode + codes.modelCode))?.model ?? null)
        : null,
    partName: codes.partCode ? (dictionary.parts.get(upper(codes.partCode)) ?? null) : null,
  };
}
