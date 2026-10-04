// File thuần (bẫy 9): hàng dùng chung nhiều hãng / dòng xe (0096). Form, bảng,
// chi tiết và scripts/test-pure-functions.ts cùng import.
import type { CodeDictionary } from "@/features/product-codes/lib/parse-product-code";

import { standardNames } from "./standard-fields";

/** Một xe dùng chung — lưu MÃ như hang_xe/dong_xe, tên tra bộ mã hóa. */
export type SharedVehicle = { brandCode: string; modelCode: string | null };

/** Dòng trong form: ô hãng có thể chưa chọn. */
export type SharedVehicleDraft = { brandCode: string | null; modelCode: string | null };

const upper = (value: string) => value.trim().toUpperCase();

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Đọc san_pham.xe_dung_chung. Khóa "hang"/"dong" là hợp đồng jsonb với 0096 —
 * giữ snake_case tiếng Việt. Phần tử sai dạng bỏ qua, không làm vỡ cả bảng.
 */
export function fromSharedVehiclesDb(value: unknown): SharedVehicle[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item) || typeof item.hang !== "string" || item.hang.trim() === "") return [];
    const model = typeof item.dong === "string" && item.dong.trim() !== "" ? item.dong : null;
    return [{ brandCode: item.hang, modelCode: model }];
  });
}

/**
 * Ghi xuống san_pham.xe_dung_chung: bỏ dòng chưa chọn hãng, bỏ trùng và bỏ cặp
 * trùng với hãng/dòng CHÍNH (đã nằm ở hang_xe/dong_xe).
 */
export function toSharedVehiclesDb(
  drafts: ReadonlyArray<SharedVehicleDraft>,
  primary: { brandCode: string | null; modelCode: string | null },
): Array<{ hang: string; dong: string | null }> {
  const keyOf = (brand: string | null, model: string | null) => `${upper(brand ?? "")}|${upper(model ?? "")}`;
  const seen = new Set([keyOf(primary.brandCode, primary.modelCode)]);
  const result: Array<{ hang: string; dong: string | null }> = [];
  for (const d of drafts) {
    if (!d.brandCode || d.brandCode.trim() === "") continue;
    const key = keyOf(d.brandCode, d.modelCode);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ hang: d.brandCode.trim(), dong: d.modelCode?.trim() || null });
  }
  return result;
}

/** "HONDA Air Blade" — tên tra được thì dùng tên, không thì hiện mã. */
export function vehicleLabel(dictionary: CodeDictionary, vehicle: SharedVehicleDraft): string | null {
  if (!vehicle.brandCode) return null;
  const names = standardNames(dictionary, { brandCode: vehicle.brandCode, modelCode: vehicle.modelCode, partCode: null });
  const brand = names.brandName ?? vehicle.brandCode;
  const model = vehicle.modelCode ? (names.modelName ?? vehicle.modelCode) : null;
  return model ? `${brand} ${model}` : brand;
}

/**
 * Xe chính trước, xe dùng chung sau — bỏ trùng theo nhãn hiển thị. Dòng xe dùng
 * chung chưa chọn đủ hãng + dòng (đang nhập dở) chưa tính.
 */
export function vehicleLabels(
  dictionary: CodeDictionary,
  primary: SharedVehicleDraft,
  shared: ReadonlyArray<SharedVehicleDraft>,
): string[] {
  const labels: string[] = [];
  for (const v of [primary, ...shared.filter((s) => s.brandCode && s.modelCode)]) {
    const label = vehicleLabel(dictionary, v);
    if (label && !labels.includes(label)) labels.push(label);
  }
  return labels;
}

const USAGE_PREFIX = "Dùng cho xe ";

/** "Dùng cho xe A và B" / "Dùng cho xe A, B và C". Một xe thì không cần câu này. */
export function usageLine(labels: ReadonlyArray<string>): string | null {
  if (labels.length < 2) return null;
  const head = labels.slice(0, -1).join(", ");
  return `${USAGE_PREFIX}${head} và ${labels[labels.length - 1]}`;
}

/**
 * Dòng đầu Mô tả do hệ thống quản lý: thay dòng "Dùng cho xe …" cũ bằng dòng
 * mới (hoặc bỏ đi khi chỉ còn một xe); phần người dùng viết bên dưới giữ nguyên.
 */
export function withUsageLine(description: string | null, line: string | null): string | null {
  const text = description ?? "";
  const rest = text.startsWith(USAGE_PREFIX) ? text.slice(text.indexOf("\n") + 1 || text.length) : text;
  const body = rest.replace(/^\n+/, "");
  const next = line ? (body ? `${line}\n${body}` : line) : body;
  return next === "" ? null : next;
}

/** Cột Hãng xe / Dòng xe trên bảng: "HONDA, YAMAHA" / "Air Blade, Acruzo". */
export function vehicleColumns(
  dictionary: CodeDictionary,
  primary: SharedVehicleDraft,
  shared: ReadonlyArray<SharedVehicleDraft>,
): { brands: string[]; models: string[] } {
  const brands: string[] = [];
  const models: string[] = [];
  for (const v of [primary, ...shared]) {
    if (!v.brandCode) continue;
    const names = standardNames(dictionary, { brandCode: v.brandCode, modelCode: v.modelCode, partCode: null });
    const brand = names.brandName ?? v.brandCode;
    if (!brands.includes(brand)) brands.push(brand);
    if (v.modelCode) {
      const model = names.modelName ?? v.modelCode;
      if (!models.includes(model)) models.push(model);
    }
  }
  return { brands, models };
}
