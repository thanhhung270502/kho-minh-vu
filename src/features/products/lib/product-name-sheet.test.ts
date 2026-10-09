import { describe, expect, it } from "vitest";
import {
  fillNamesFromSheet,
  readProductNameSheet,
} from "@/features/products/lib/product-name-sheet";
import {
  INITIAL_IMPORT_STATE,
  importReducer,
} from "@/features/products/lib/new-product-import-state";
import {
  CATALOG_REASONS,
  draftProblems,
  toDraftRows,
} from "@/features/products/lib/new-product-import";

describe("product-name-sheet", () => {
  it("tên hàng tự điền từ sheet tên hàng chuẩn (04/10/2026)", () => {
    // Sheet thật: 2 cột không tiêu đề, có dòng rác "--," và mã lặp.
    const names = readProductNameSheet(
      "﻿YAC-01-X,Ốp chắn bùn  trước ACRUZO xi\r\n--,\r\n" +
        '-TKX--201/304,"Tay kiếng xoay 360 Inox 201, 304"\r\nyac-01-x,Tên lặp\r\n',
    );
    expect(names.size, "bỏ dòng thiếu tên, mã lặp giữ dòng đầu").toBe(2);
    expect(
      names.get("yac-01-x"),
      "khóa không phân biệt hoa thường, gộp khoảng trắng",
    ).toBe("Ốp chắn bùn trước ACRUZO xi");
    expect(names.get("-tkx--201/304"), "tên có dấu phẩy trong ngoặc kép").toBe(
      "Tay kiếng xoay 360 Inox 201, 304",
    );

    const filled = fillNamesFromSheet(
      [
        {
          row: 2,
          code: "Yac-01-X",
          name: "",
          nameFromSheet: false,
          stock: 0,
          description: "",
          problems: [],
        },
        {
          row: 3,
          code: "YAC-01-X",
          name: "Tên tự gõ",
          nameFromSheet: false,
          stock: 0,
          description: "",
          problems: [],
        },
        {
          row: 4,
          code: "KHONG-CO",
          name: "",
          nameFromSheet: false,
          stock: 0,
          description: "",
          problems: [],
        },
      ],
      names,
    );
    expect(
      filled.map((r) => [r.name, r.nameFromSheet]),
      "chỉ điền ô trống; tên trong file thắng sheet",
    ).toStrictEqual([
      ["Ốp chắn bùn trước ACRUZO xi", true],
      ["Tên tự gõ", false],
      ["", false],
    ]);

    // Sửa tên trên màn xem trước: bỏ lỗi "tên đã có trong danh mục" của đúng dòng đó.
    const drafts = toDraftRows(filled, { unitId: "u" });
    const loaded = importReducer(INITIAL_IMPORT_STATE, {
      type: "loaded",
      drafts,
      catalog: new Map([
        [2, [CATALOG_REASONS.code, CATALOG_REASONS.name]],
        [3, [CATALOG_REASONS.name]],
      ]),
      nameSheetError: null,
    });
    const edited = importReducer(loaded, {
      type: "edit",
      rows: [2],
      patch: { name: "Tên mới", nameFromSheet: false },
    });
    expect(edited.catalog.get(2), "giữ lỗi trùng mã").toStrictEqual([
      CATALOG_REASONS.code,
    ]);
    expect(edited.catalog.get(3), "dòng khác không đổi").toStrictEqual([
      CATALOG_REASONS.name,
    ]);
    expect(edited.drafts[0]?.name).toBe("Tên mới");
    expect(
      draftProblems(edited.drafts, edited.catalog).get(4),
      "mã không có trong sheet vẫn báo thiếu tên",
    ).toStrictEqual(["Thiếu tên hàng"]);
  });
});
