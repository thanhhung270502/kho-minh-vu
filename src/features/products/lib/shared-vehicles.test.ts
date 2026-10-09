import { describe, expect, it } from "vitest";
import {
  fromSharedVehiclesDb,
  toSharedVehiclesDb,
  usageLine,
  vehicleColumns,
  vehicleLabels,
  withUsageLine,
} from "@/features/products/lib/shared-vehicles";
import { dictionaryFromEntries } from "@/features/product-codes/lib/sync-entries";

describe("shared-vehicles", () => {
  it("xe dùng chung nhiều hãng / dòng (0096)", () => {
    const dict = dictionaryFromEntries([
      { loai: "hang", ma: "H", ten: "HONDA", ma_hang: null, thu_tu: 1 },
      { loai: "hang", ma: "Y", ten: "YAMAHA", ma_hang: null, thu_tu: 2 },
      { loai: "dong", ma: "A", ten: "Air Blade", ma_hang: "H", thu_tu: 3 },
      { loai: "dong", ma: "V", ten: "Vision", ma_hang: "H", thu_tu: 4 },
      { loai: "dong", ma: "AC", ten: "Acruzo", ma_hang: "Y", thu_tu: 5 },
    ]);
    // Đọc: bỏ phần tử sai dạng; khóa "hang"/"dong" là hợp đồng jsonb.
    expect(
      fromSharedVehiclesDb([
        { hang: "Y", dong: "AC" },
        { hang: "" },
        "rác",
        { hang: "H", dong: "" },
      ]),
    ).toStrictEqual([
      { brandCode: "Y", modelCode: "AC" },
      { brandCode: "H", modelCode: null },
    ]);
    expect(fromSharedVehiclesDb(null)).toStrictEqual([]);
    // Ghi: bỏ dòng chưa chọn hãng, bỏ trùng và bỏ cặp trùng xe chính.
    expect(
      toSharedVehiclesDb(
        [
          { brandCode: "Y", modelCode: "AC" },
          { brandCode: "y", modelCode: "ac" },
          { brandCode: "H", modelCode: "A" },
          { brandCode: null, modelCode: null },
        ],
        { brandCode: "H", modelCode: "A" },
      ),
    ).toStrictEqual([{ hang: "Y", dong: "AC" }]);
    const labels = vehicleLabels(dict, { brandCode: "H", modelCode: "A" }, [
      { brandCode: "Y", modelCode: "AC" },
      { brandCode: "H", modelCode: "V" },
    ]);
    expect(labels).toStrictEqual([
      "HONDA Air Blade",
      "YAMAHA Acruzo",
      "HONDA Vision",
    ]);
    expect(usageLine(labels.slice(0, 2))).toBe(
      "Dùng cho xe HONDA Air Blade và YAMAHA Acruzo",
    );
    expect(usageLine(labels)).toBe(
      "Dùng cho xe HONDA Air Blade, YAMAHA Acruzo và HONDA Vision",
    );
    expect(
      usageLine(["HONDA Air Blade"]),
      "một xe không cần câu dùng chung",
    ).toBe(null);
    // Mô tả: thay dòng đầu do hệ thống quản lý, giữ phần người dùng viết.
    expect(withUsageLine("Hàng loại 1", "Dùng cho xe A và B")).toBe(
      "Dùng cho xe A và B\nHàng loại 1",
    );
    const A = "Dùng cho xe A và B";
    const C = "Dùng cho xe A, B và C";
    // Chỉ thay/bỏ dòng đầu khi nó đúng là dòng hệ thống sinh lần trước.
    expect(withUsageLine(`${A}\nHàng loại 1`, C, A)).toBe(`${C}\nHàng loại 1`);
    expect(withUsageLine(`${A}\nHàng loại 1`, null, A)).toBe("Hàng loại 1");
    expect(withUsageLine(A, null, A)).toBe(null);
    // Dòng "Dùng cho xe …" do người dùng / KiotViet viết thì giữ nguyên.
    expect(withUsageLine("Dùng cho xe Wave\nx", null, null)).toBe(
      "Dùng cho xe Wave\nx",
    );
    expect(withUsageLine("Dùng cho xe Wave\nx", A, null)).toBe(
      `${A}\nDùng cho xe Wave\nx`,
    );
    expect(withUsageLine("Dùng cho xe Wave", null, A)).toBe("Dùng cho xe Wave");
    expect(withUsageLine(`${A}\nx`, A, null)).toBe(`${A}\nx`);
    expect(withUsageLine(null, "Dùng cho xe A và B")).toBe(
      "Dùng cho xe A và B",
    );
    // Cột bảng: hãng không lặp, dòng theo thứ tự.
    expect(
      vehicleColumns(dict, { brandCode: "H", modelCode: "A" }, [
        { brandCode: "H", modelCode: "V" },
        { brandCode: "Y", modelCode: "AC" },
      ]),
    ).toStrictEqual({
      brands: ["HONDA", "YAMAHA"],
      models: ["Air Blade", "Vision", "Acruzo"],
    });
  });
});
