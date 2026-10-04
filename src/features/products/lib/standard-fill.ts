// File thuần: "Điền quy chuẩn từ mã" cho mã cũ (quy chuẩn mã, phần A).
// Giao diện xem trước bằng chính hàm này rồi mới gửi RPC dien_quy_chuan — số
// xem trước phải khớp số RPC thật sự đổi, nên quy tắc ở đây PHẢI trùng RPC:
// chỉ lấp ô trống, không đụng ô chọn tay, xử lý "trống" = ngoài quy chuẩn.
import { parseProductCode, type CodeDictionary } from "@/features/product-codes/lib/parse-product-code";

import type { StandardFieldKey } from "./standard-fields";

export type StandardFillSource = {
  id: string;
  code: string;
  name: string;
  brandCode: string | null;
  modelCode: string | null;
  partCode: string | null;
  /** Mã xử lý quy chuẩn của xử lý hiện tại; null = ngoài quy chuẩn (Mua ngoài, Ép). */
  finishCode: string | null;
  manualFields: string[];
};

/** Chỉ mang trường SẼ được điền — trường vắng mặt là giữ nguyên. */
export type StandardFillChange = {
  id: string;
  brandCode?: string;
  modelCode?: string;
  partCode?: string;
  finishCode?: string;
};

export type StandardFillPlan = {
  total: number;
  /** Mã tách đủ 4 trường theo quy chuẩn. */
  validCount: number;
  /** Mã sai chuẩn — kèm câu lý do y như cột Ghi chú của sheet. */
  invalid: Array<{ code: string; name: string; reason: string }>;
  changes: StandardFillChange[];
  /** Số ô sẽ được điền theo từng trường. */
  fieldCounts: Record<StandardFieldKey, number>;
};

const isEmpty = (value: string | null) => value === null || value.trim() === "";

export function planStandardFill(
  products: ReadonlyArray<StandardFillSource>,
  dictionary: CodeDictionary,
  /** Mã xử lý quy chuẩn có công đoạn tương ứng — mã lạ RPC không gán được. */
  knownFinishCodes: ReadonlySet<string>,
): StandardFillPlan {
  const plan: StandardFillPlan = {
    total: products.length,
    validCount: 0,
    invalid: [],
    changes: [],
    fieldCounts: { hang_xe: 0, dong_xe: 0, linh_kien: 0, xu_ly: 0 },
  };

  for (const product of products) {
    const parsed = parseProductCode(product.code, dictionary);
    if (parsed.status === "ok") plan.validCount++;
    else plan.invalid.push({ code: product.code, name: product.name, reason: parsed.note });

    const manual = new Set(product.manualFields);
    const fillable = (key: StandardFieldKey, current: string | null, next: string) =>
      !manual.has(key) && isEmpty(current) && next !== "";

    const change: StandardFillChange = { id: product.id };
    if (fillable("hang_xe", product.brandCode, parsed.brandCode)) change.brandCode = parsed.brandCode;
    if (fillable("dong_xe", product.modelCode, parsed.modelCode)) change.modelCode = parsed.modelCode;
    if (fillable("linh_kien", product.partCode, parsed.partCode)) change.partCode = parsed.partCode;
    if (
      fillable("xu_ly", product.finishCode, parsed.finishCode) &&
      knownFinishCodes.has(parsed.finishCode.toUpperCase())
    ) {
      change.finishCode = parsed.finishCode;
    }

    if (change.brandCode !== undefined) plan.fieldCounts.hang_xe++;
    if (change.modelCode !== undefined) plan.fieldCounts.dong_xe++;
    if (change.partCode !== undefined) plan.fieldCounts.linh_kien++;
    if (change.finishCode !== undefined) plan.fieldCounts.xu_ly++;
    if (Object.keys(change).length > 1) plan.changes.push(change);
  }

  return plan;
}

/** RPC nhận tối đa 1.000 dòng một lần — chia lô. */
export function chunk<T>(items: ReadonlyArray<T>, size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
