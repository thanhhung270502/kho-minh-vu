import { randomUUID } from "node:crypto";

import { beforeAll, describe, expect, it } from "vitest";

import {
  createProduct,
  fetchLookups,
  fetchStockByWarehouse,
} from "@/features/products/api/product.api";
import type { ProductInput } from "@/features/products/types";
import {
  addReceiptLine,
  createReceipt,
  postReceipt,
} from "@/features/stock-in/api/receipt.api";

import { k1WarehouseId, useRole } from "./support/session";

// Sổ cái kho append-only nên dữ liệu ITEST-* không xóa được; CI chạy trên DB vừa reset,
// còn local muốn sạch thì `npm run db:reset`. Mã hàng ngẫu nhiên nên chạy lặp không va nhau.
// Không assert số phiếu cụ thể: chuoi_so_ct là bộ đếm thật (bẫy 16).

describe("quản lý ghi sổ phiếu nhập qua PostgREST", () => {
  beforeAll(async () => {
    await useRole("quan_ly");
  });

  it("ghi sổ tăng tồn kho K1 đúng số lượng (rpc ghi_so_chung_tu, bẫy 22)", async () => {
    const lookups = await fetchLookups();
    const unit = lookups.units[0];
    const stage = lookups.stages[0];
    if (!unit || !stage)
      throw new Error("DB local thiếu đơn vị tính / công đoạn nền.");

    const input: ProductInput = {
      code: `ITEST-${randomUUID().slice(0, 8)}`,
      name: "Mã hàng test integration",
      categoryId: null,
      unitId: unit.id,
      stageId: stage.id,
      conversion: 1,
      defaultWarehouseId: null,
      minStock: 0,
      maxStock: null,
      barcode: null,
      description: null,
      isActive: true,
      kind: "HANG_HOA",
      directSale: true,
      shelfLocation: null,
      brandCode: null,
      modelCode: null,
      partCode: null,
      sharedVehicles: [],
      manualFields: [],
    };
    const productId = await createProduct(input);
    const warehouseId = k1WarehouseId();

    const before = await fetchStockByWarehouse(productId);
    expect(
      before.find((s) => s.warehouseId === warehouseId)?.quantity ?? 0,
    ).toBe(0);

    const receiptId = await createReceipt({
      partnerId: null,
      warehouseId,
      source: "NCC",
    });
    await addReceiptLine(receiptId, {
      productId,
      quantity: 7,
      unitPrice: 1000,
      warehouseId,
    });
    await postReceipt(receiptId);

    const after = await fetchStockByWarehouse(productId);
    expect(after.find((s) => s.warehouseId === warehouseId)?.quantity).toBe(7);
  });
});
