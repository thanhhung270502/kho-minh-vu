import { describe, expect, it } from "vitest";
import {
  CATALOG_REASONS,
  applyToRows,
  catalogProblemsFrom,
  draftProblems,
  matchLookup,
  toDraftRows,
  toErrorExportRows,
  toImportPayload,
} from "@/features/products/lib/new-product-import";
import type { Lookups } from "@/features/products/types";

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
      cong_doan_id: null,
      kho_mac_dinh_id: null,
      loai_hang: "HANG_HOA",
      dang_kinh_doanh: true,
      duoc_ban_truc_tiep: true,
      vi_tri_ke: "K-1",
    });
  });

  it("file cùng bố cục file cập nhật: khớp Nhóm / ĐVT / Xử lý / Vị trí ra id (0141)", () => {
    const lookups: Lookups = {
      categories: [
        { id: "nh-bt", code: "BT", name: "Bố thắng" },
        { id: "nh-x1", code: "X1", name: "Trùng" },
        { id: "nh-x2", code: "X2", name: "Trùng" },
      ],
      units: [{ id: "dvt-cai", code: "CAI", name: "Cái" }],
      stages: [{ id: "cd-mn", code: "MUA_NGOAI", name: "Mua ngoài", color: null, standardCode: null }],
      warehouses: [{ id: "k2", code: "K2", name: "Kho 2" }],
    };
    expect(matchLookup(lookups.categories, " bo THANG "), "tên không dấu, hoa thường").toBe("nh-bt");
    expect(matchLookup(lookups.stages, "mua ngoai"), "mã có gạch dưới khớp dạng có dấu cách").toBe("cd-mn");
    expect(matchLookup(lookups.warehouses, "k2"), "khớp theo mã").toBe("k2");
    expect(matchLookup(lookups.categories, "Trùng"), "nhiều mục cùng khớp thì không đoán").toBe(null);

    const base = { nameFromSheet: false, stock: 0, description: "", problems: [] };
    const drafts = toDraftRows(
      [
        {
          ...base,
          row: 2,
          code: "A",
          name: "Áo",
          lookupText: { category: "Bố thắng", unit: "cai", stage: "Mua ngoài", warehouse: "Kho 2" },
          isActive: false,
        },
        {
          ...base,
          row: 3,
          code: "B",
          name: "Bé",
          lookupText: { category: "Không có", unit: "Thùng", stage: "", warehouse: "" },
          isActive: null,
        },
      ],
      { unitId: "dvt-cai", lookups },
    );
    expect(drafts[0]).toMatchObject({
      categoryId: "nh-bt",
      unitId: "dvt-cai",
      stageId: "cd-mn",
      warehouseId: "k2",
      isActive: false,
      unmatched: {},
    });
    expect(drafts[1].unitId, "ĐVT có chữ mà không khớp: không lấy mặc định Cái").toBe(null);
    expect(drafts[1].isActive, "ô Đang kinh doanh trống = đang kinh doanh").toBe(true);

    const problems = draftProblems(drafts, new Map());
    expect(problems.get(2)).toBe(undefined);
    expect(problems.get(3)).toStrictEqual([
      "Không có nhóm hàng “Không có” — chọn lại",
      "Không có đơn vị tính “Thùng” — chọn lại",
    ]);

    expect(toErrorExportRows(drafts, problems, lookups)[0], "file lỗi giữ chữ chưa khớp").toMatchObject({
      category: "Không có",
      unit: "Thùng",
      stage: "",
      warehouse: "",
    });

    // Chọn lại ô (kể cả xóa trống nhóm hàng) thì lỗi chữ không khớp mất đi.
    const fixed = applyToRows(drafts, [3], { categoryId: null, unitId: "dvt-cai" });
    expect(draftProblems(fixed, new Map()).get(3)).toBe(undefined);
    expect(toImportPayload(fixed, new Map())[0]).toMatchObject({ cong_doan_id: "cd-mn", kho_mac_dinh_id: "k2" });
  });
});
