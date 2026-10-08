import { describe, expect, it } from "vitest";
import {
  buildCodeDictionary,
  parseProductCode,
} from "@/features/product-codes/lib/parse-product-code";
import {
  applyCodeToStandardFields,
  standardNames,
  toggleManual,
} from "@/features/products/lib/standard-fields";
import { chunk, planStandardFill } from "@/features/products/lib/standard-fill";

describe("standard-fields", () => {
  it("gõ mã tự điền, giữ ô chọn tay, điền quy chuẩn cho mã cũ", () => {
    const dict = buildCodeDictionary([
      {
        brand: "HONDA",
        brandCode: "H",
        model: "Air Blade",
        modelCode: "A",
        part: "Mặt nạ",
        partCode: "75",
        finish: "carbon",
        finishCode: "CB",
        color: "",
        colorCode: "",
      },
      {
        brand: "YAMAHA",
        brandCode: "Y",
        model: "Exciter",
        modelCode: "E",
        part: "Ốp bầu lọc gió",
        partCode: "12",
        finish: "xi",
        finishCode: "X",
        color: "",
        colorCode: "",
      },
    ]);
    const stages = [
      { id: "st-cb", standardCode: "CB" },
      { id: "st-x", standardCode: "X" },
      { id: "st-mn", standardCode: null },
    ];
    const empty = {
      brandCode: null,
      modelCode: null,
      partCode: null,
      stageId: "st-mn",
      manualFields: [] as string[],
    };

    // Mã đúng chuẩn: điền đủ 4 ô, cả 4 đánh dấu "tự điền".
    const r1 = applyCodeToStandardFields(
      parseProductCode("HA26-75-35-WRG-CB", dict),
      empty,
      stages,
      "st-mn",
    );
    expect([
      r1.brandCode,
      r1.modelCode,
      r1.partCode,
      r1.stageId,
      r1.autoFields,
    ]).toStrictEqual([
      "H",
      "A",
      "75",
      "st-cb",
      ["hang_xe", "dong_xe", "linh_kien", "xu_ly"],
    ]);

    // Đổi sang mã khác: ô tự điền đi theo mã mới; ô CHỌN TAY giữ nguyên.
    const manual = { ...r1, partCode: "12", manualFields: ["linh_kien"] };
    const r2 = applyCodeToStandardFields(
      parseProductCode("YE15-75-X", dict),
      manual,
      stages,
      "st-mn",
    );
    expect(
      [r2.brandCode, r2.modelCode, r2.partCode, r2.stageId],
      "linh kiện chọn tay giữ 12",
    ).toStrictEqual(["Y", "E", "12", "st-x"]);
    expect(!r2.autoFields.includes("linh_kien")).toBeTruthy();

    // Mã không tách được xử lý: công đoạn (bắt buộc) về "ngoài quy chuẩn" (Mua ngoài),
    // KHÔNG giữ xử lý tự điền của mã gõ trước — lưu sẽ ghi sai.
    const r3 = applyCodeToStandardFields(
      parseProductCode("YE15-12Z", dict),
      { ...r1, manualFields: [] },
      stages,
      "st-mn",
    );
    expect(r3.stageId, "carbon của mã trước không được giữ lại").toBe("st-mn");
    expect(!r3.autoFields.includes("xu_ly")).toBeTruthy();
    expect(
      r3.partCode,
      "phần [12Z] không tách được → linh kiện trống để chọn tay",
    ).toBe(null);

    // Chọn tay / bỏ chọn tay một ô.
    // Xử lý chọn tay thì mã không tách được vẫn giữ nguyên.
    const r4 = applyCodeToStandardFields(
      parseProductCode("YE15-12Z", dict),
      { ...r1, manualFields: ["xu_ly"] },
      stages,
      "st-mn",
    );
    expect(r4.stageId).toBe("st-cb");

    expect(toggleManual(["hang_xe"], "linh_kien", true)).toStrictEqual([
      "hang_xe",
      "linh_kien",
    ]);
    expect(
      toggleManual(["hang_xe", "linh_kien"], "hang_xe", false),
    ).toStrictEqual(["linh_kien"]);
    expect(
      toggleManual(["hang_xe"], "hang_xe", true),
      "không trùng",
    ).toStrictEqual(["hang_xe"]);

    // Bảng danh mục lưu mã → tra tên; dòng xe tra theo cặp hãng + dòng, không phân biệt hoa thường.
    expect(
      standardNames(dict, { brandCode: "h", modelCode: "a", partCode: "75" }),
    ).toStrictEqual({
      brandName: "HONDA",
      modelName: "Air Blade",
      partName: "Mặt nạ",
    });
    expect(
      standardNames(dict, { brandCode: "Y", modelCode: "A", partCode: null })
        .modelName,
      "A là dòng của Honda, không phải Yamaha",
    ).toBe(null);
    expect(
      standardNames(dict, { brandCode: null, modelCode: null, partCode: "ZZ" }),
    ).toStrictEqual({
      brandName: null,
      modelName: null,
      partName: null,
    });

    // Điền quy chuẩn từ mã cho mã cũ: chỉ ô trống, không đụng ô chọn tay.
    const base = {
      name: "x",
      brandCode: null,
      modelCode: null,
      partCode: null,
      finishCode: null,
      manualFields: [] as string[],
    };
    const plan = planStandardFill(
      [
        { ...base, id: "1", code: "HA26-75-35-WRG-CB" }, // trống hết → điền 4 ô
        {
          ...base,
          id: "2",
          code: "HA26-75-CB",
          brandCode: "Y",
          finishCode: "X",
        }, // hãng + xử lý đã có → giữ
        {
          ...base,
          id: "3",
          code: "HA26-75-CB",
          manualFields: ["linh_kien", "xu_ly"],
        }, // chọn tay → bỏ qua
        { ...base, id: "4", code: "06410KFL850" }, // sai chuẩn, không tách được gì
        {
          ...base,
          id: "5",
          code: "HA26-75-CB",
          brandCode: "H",
          modelCode: "A",
          partCode: "75",
          finishCode: "CB",
        }, // đủ → không đổi
      ],
      dict,
      new Set(["CB", "X"]),
    );
    expect(plan.total).toBe(5);
    expect(plan.validCount).toBe(4);
    expect(plan.invalid.map((i) => i.code)).toStrictEqual(["06410KFL850"]);
    expect(plan.invalid[0].reason).toBe(
      "Mã không theo quy chuẩn (không có dấu -)",
    );
    expect(plan.changes).toStrictEqual([
      {
        id: "1",
        brandCode: "H",
        modelCode: "A",
        partCode: "75",
        finishCode: "CB",
      },
      { id: "2", modelCode: "A", partCode: "75" },
      { id: "3", brandCode: "H", modelCode: "A" },
    ]);
    expect(plan.fieldCounts).toStrictEqual({
      hang_xe: 2,
      dong_xe: 3,
      linh_kien: 2,
      xu_ly: 1,
    });
    // Mã xử lý chưa có công đoạn tương ứng → không gửi (RPC không gán được).
    const unknown = planStandardFill(
      [{ ...base, id: "6", code: "HA26-75-CB" }],
      dict,
      new Set(["X"]),
    );
    expect(unknown.changes[0].finishCode).toBe(undefined);
    expect(chunk([1, 2, 3, 4, 5], 2)).toStrictEqual([[1, 2], [3, 4], [5]]);
  });
});
