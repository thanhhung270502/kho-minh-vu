import { describe, expect, it } from "vitest";
import {
  CATALOG_REASONS,
  applyToRows,
  catalogProblemsFrom,
  draftProblems,
  toDraftRows,
  toImportPayload,
} from "@/features/products/lib/new-product-import";

describe("new-product-import", () => {
  it("màn xem trước nhập mã mới (Phase 15, IMP-02/03)", () => {
    const cai = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    const lh = "11111111-1111-4111-8111-111111111111";
    const drafts = toDraftRows(
      [
        {
          row: 2,
          code: "A",
          name: "Áo",
          nameFromSheet: false,
          stock: 3,
          description: "d",
          problems: [],
        },
        {
          row: 3,
          code: "B",
          name: "Bé",
          nameFromSheet: false,
          stock: 0,
          description: "",
          problems: ["Tồn kho không phải là số"],
        },
        {
          row: 4,
          code: "C",
          name: "Cá",
          nameFromSheet: false,
          stock: 1,
          description: "",
          problems: [],
        },
      ],
      { unitId: cai },
    );
    expect(drafts[0].unitId, "ĐVT mặc định CAI").toBe(cai);
    expect(
      drafts[0].isActive && drafts[0].directSale,
      "mặc định đang KD + bán trực tiếp",
    ).toBe(true);

    // Áp hàng loạt chỉ đổi đúng dòng đã chọn, không đụng mảng gốc.
    const applied = applyToRows(drafts, [2, 4], {
      kind: "COMBO",
      directSale: false,
    });
    expect(applied.map((r) => r.kind)).toStrictEqual([
      "COMBO",
      "HANG_HOA",
      "COMBO",
    ]);
    expect(applied.map((r) => r.directSale)).toStrictEqual([
      false,
      true,
      false,
    ]);
    expect(drafts[0].kind, "không sửa mảng gốc; mặc định Hàng hóa").toBe(
      "HANG_HOA",
    );

    // Lỗi của dòng = lỗi đọc file + trùng trong file + thiếu ĐVT + đã có trong danh mục.
    const catalog = catalogProblemsFrom([
      {
        dong: 4,
        ly_do: "Tên hàng đã có trong danh mục; Chưa chọn đơn vị tính",
      },
    ]);
    expect(
      catalog.get(4),
      "chỉ giữ lỗi trùng danh mục, bỏ lỗi đã tự kiểm ở client",
    ).toStrictEqual([CATALOG_REASONS.name]);
    const noUnit = applyToRows(applied, [2], { unitId: null });
    const problems = draftProblems(noUnit, catalog);
    expect(problems.get(2)).toStrictEqual(["Chưa chọn đơn vị tính"]);
    expect(problems.get(3)).toStrictEqual(["Tồn kho không phải là số"]);
    expect(problems.get(4)).toStrictEqual([CATALOG_REASONS.name]);

    // Payload: chỉ dòng sạch, khóa jsonb đúng hợp đồng RPC nhap_ma_hang_moi.
    const clean = applyToRows(drafts, [4], {
      categoryId: lh,
      shelfLocation: " K-1 ",
    });
    const payload = toImportPayload(clean, new Map([[3, ["x"]]]));
    expect(
      payload.map((p) => p.dong),
      "bỏ dòng đang lỗi",
    ).toStrictEqual([2, 4]);
    expect(payload[1]).toStrictEqual({
      dong: 4,
      ma_hang: "C",
      ten_hang: "Cá",
      ton_kho: 1,
      mo_ta: "",
      dvt_id: cai,
      nhom_hang_id: lh,
      loai_hang: "HANG_HOA",
      dang_kinh_doanh: true,
      duoc_ban_truc_tiep: true,
      vi_tri_ke: "K-1",
    });
  });
});
