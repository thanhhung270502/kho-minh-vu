import { describe, expect, it } from "vitest";
import {
  copyProductDefaults,
  expandedActions,
  forecastById,
  standardFieldText,
  toProductFormValues,
} from "@/features/products/lib/product-expanded";

describe("product-expanded", () => {
  it("chi tiết dạng dòng mở rộng (PANEL-01)", () => {
    // Sao chép: giữ mọi trường, mã để trống để người dùng gõ mã mới.
    const copied = copyProductDefaults({
      code: "HA26-33K-PC",
      name: "Hộc chứa đồ",
      categoryId: "c",
      unitId: "u",
      stageId: "s",
      conversion: 2,
      defaultWarehouseId: "k",
      minStock: 1,
      maxStock: 9,
      barcode: "123",
      description: "n",
      isActive: false,
      kind: "COMBO",
      directSale: false,
      shelfLocation: "A-1",
      brandCode: "H",
      modelCode: "A",
      partCode: "75",
      sharedVehicles: [],
      manualFields: [],
    });
    expect(copied.code).toBe("");
    expect(copied.barcode, "barcode thường là duy nhất — không chép").toBe(
      null,
    );
    expect(copied.isActive, "mã mới luôn đang kinh doanh").toBe(true);
    expect(copied.name).toBe("Hộc chứa đồ");
    expect(copied.kind).toBe("COMBO");

    // Ghép số phân tích vào từng dòng bảng theo id sản phẩm.
    const map = forecastById(
      [
        {
          productId: "a",
          customerOrdered: 3,
          avgDailySales: 1,
          daysOfCover: 4.2,
          stockoutDate: "2026-10-06",
          available: 4.2,
        },
        {
          productId: "b",
          customerOrdered: 0,
          avgDailySales: null,
          daysOfCover: null,
          stockoutDate: null,
          available: 9,
        },
      ],
      30,
    );
    // Cần đặt = ⌈1 × 30 − 4,2⌉ = 26 — cùng công thức Đề nghị nhập trang Phân tích.
    expect(map.get("a")).toStrictEqual({
      customerOrdered: 3,
      stockoutDate: "2026-10-06",
      daysOfCover: 4.2,
      selling: true,
      toOrder: 26,
    });
    expect(map.get("b")?.toOrder, "không bán thì không cần đặt").toBe(0);
    expect(
      map.get("b")?.selling,
      "không bán trong kỳ: hiện 'Không bán', không có ngày",
    ).toBe(false);
    expect(map.get("zzz")).toBe(undefined);

    // Hàng nút: không có quyền Tạo mã hàng chỉ còn Xem chi tiết; mã ngừng KD có "Kinh doanh lại".
    expect(expandedActions({ canEdit: false, isActive: true })).toStrictEqual([
      "detail",
    ]);
    expect(expandedActions({ canEdit: true, isActive: true })).toStrictEqual([
      "deactivate",
      "copy",
      "detail",
      "edit",
    ]);
    expect(expandedActions({ canEdit: true, isActive: false })).toStrictEqual([
      "reactivate",
      "copy",
      "detail",
      "edit",
    ]);

    // Chi tiết mã → giá trị form: null thành giá trị rỗng form hiểu được.
    const form = toProductFormValues({
      code: "A",
      name: "B",
      categoryId: null,
      unitId: null,
      stageId: "s",
      conversion: 1,
      defaultWarehouseId: null,
      minStock: 0,
      maxStock: null,
      barcode: null,
      description: "d",
      isActive: true,
      kind: "HANG_HOA",
      directSale: true,
      shelfLocation: null,
      brandCode: "H",
      modelCode: null,
      partCode: null,
      sharedVehicles: [],
      manualFields: ["dong_xe"],
    });
    expect(form.unitId, "ĐVT null → chuỗi rỗng để Select hiện ô trống").toBe(
      "",
    );
    expect(form.manualFields).toStrictEqual(["dong_xe"]);
    expect(form.description).toBe("d");

    expect(standardFieldText("Air Blade", "A")).toBe("Air Blade");
    expect(
      standardFieldText(null, "ZZ"),
      "mã bị bỏ khỏi bộ mã hóa vẫn hiện",
    ).toBe("ZZ (không có trong bộ mã hóa)");
    expect(standardFieldText(null, null)).toBe(null);
  });
});
