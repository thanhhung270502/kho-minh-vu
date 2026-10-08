import { describe, expect, it } from "vitest";
import { toProductInsert, type ProductInput } from "@/features/products/types";
import { TEMPLATE_COLUMNS } from "@/features/products/lib/excel-template";

describe("products/types", () => {
  it("payload ghi mã hàng không mang gia_ban / gia_von / ghi_chu (Phase 10, GON-03)", () => {
    {
      const input = {
        code: "ABC",
        name: "Tên",
        categoryId: null,
        unitId: "u",
        stageId: "s",
        conversion: 1,
        defaultWarehouseId: null,
        minStock: 0,
        maxStock: null,
        barcode: null,
        description: "Mô tả",
        isActive: true,
        kind: "COMBO",
        directSale: false,
        shelfLocation: "A-01",
        brandCode: "H",
        modelCode: null,
        partCode: "75",
        sharedVehicles: [],
        manualFields: ["linh_kien"],
      } satisfies ProductInput;
      const payload = toProductInsert(input);
      expect(
        !("gia_ban" in payload),
        "payload ghi mã hàng không có gia_ban",
      ).toBeTruthy();
      expect(
        !("gia_von" in payload),
        "payload ghi mã hàng không có gia_von",
      ).toBeTruthy();
      expect(payload.duoc_ban_truc_tiep).toBe(false);
      expect(payload.vi_tri_ke).toBe("A-01");
      // Quy chuẩn mã (B): Loại hàng = HANG_HOA/COMBO; Mô tả vào mo_ta. Ghi chú do DB tự
      // sinh — payload KHÔNG được mang ghi_chu (trigger sẽ đè, người dùng tưởng đã lưu).
      expect(payload.loai_hang).toBe("COMBO");
      expect(payload.mo_ta).toBe("Mô tả");
      expect(!("ghi_chu" in payload), "form không ghi ghi_chu").toBeTruthy();
      // Phần A: form quản lý Hãng/Dòng/Linh kiện (mã) + danh sách ô chọn tay.
      expect(payload.hang_xe).toBe("H");
      expect(payload.dong_xe).toBe(null);
      expect(payload.truong_chon_tay).toStrictEqual(["linh_kien"]);
      const keys = TEMPLATE_COLUMNS.map((c) => c.key as string);
      expect(
        !keys.includes("gia_ban") && !keys.includes("gia_von"),
        "mẫu Excel không có cột giá",
      ).toBeTruthy();
    }
  });
});
