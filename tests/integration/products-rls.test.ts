import { beforeAll, describe, expect, it } from "vitest";

import {
  fetchProductCost,
  fetchProducts,
} from "@/features/products/api/product.api";
import { DEFAULT_PRODUCT_FILTER } from "@/features/products/schemas/filter.schema";
import { createReceipt } from "@/features/stock-in/api/receipt.api";
import { errorCode } from "@/shared/lib/errors";

import { k1WarehouseId, useRole } from "./support/session";

// Bẫy 5: san_pham không có quyền SELECT mức bảng (0029) — pgTAP chạy bằng `postgres` nên không bắt được.

const UNKNOWN_PRODUCT_ID = "00000000-0000-4000-8000-000000000000";

async function rejection(promise: PromiseLike<unknown>): Promise<unknown> {
  try {
    await promise;
  } catch (error) {
    return error;
  }
  throw new Error("Kỳ vọng bị từ chối nhưng thao tác thành công.");
}

describe("thủ kho K1", () => {
  let client: Awaited<ReturnType<typeof useRole>>;

  beforeAll(async () => {
    client = await useRole("thu_kho");
  });

  it("đọc được danh sách mã hàng qua RPC", async () => {
    const page = await fetchProducts(DEFAULT_PRODUCT_FILTER);
    expect(Array.isArray(page.rows)).toBe(true);
    expect(page.total).toBeGreaterThanOrEqual(0);
  });

  it("không đọc được giá vốn (42501)", async () => {
    const error = await rejection(fetchProductCost(UNKNOWN_PRODUCT_ID));
    expect(errorCode(error)).toBe("42501");
  });

  it('select("*") trên san_pham bị 42501', async () => {
    const { error } = await client.from("san_pham").select("*");
    expect(error?.code).toBe("42501");
  });

  it("chọn cột gia_von trực tiếp cũng bị 42501", async () => {
    const { error } = await client.from("san_pham").select("id, gia_von");
    expect(error?.code).toBe("42501");
  });

  it("liệt kê cột đã cấp quyền thì đọc được", async () => {
    const { error } = await client
      .from("san_pham")
      .select("id, ma_hang, ten_hang");
    expect(error).toBeNull();
  });
});

describe("chỉ xem", () => {
  beforeAll(async () => {
    await useRole("chi_xem");
  });

  it("không tạo được phiếu nhập", async () => {
    const error = await rejection(
      createReceipt({
        partnerId: null,
        warehouseId: k1WarehouseId(),
        source: "NCC",
      }),
    );
    // Mã thực tế được ghi lại bằng chính assertion này: RLS chặn insert chung_tu.
    expect(errorCode(error)).toBe("42501");
  });
});
