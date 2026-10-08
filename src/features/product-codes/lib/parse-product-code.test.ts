import { describe, expect, it } from "vitest";
import {
  buildCodeDictionary,
  parseProductCode,
} from "@/features/product-codes/lib/parse-product-code";
import {
  SourceSheetError,
  readSourceSheet,
} from "@/features/product-codes/lib/source-sheet";
import {
  dictionaryFromEntries,
  toSyncEntries,
} from "@/features/product-codes/lib/sync-entries";

describe("parse-product-code", () => {
  it("tách mã như công thức TRA_CUU, đọc sheet nguồn, đồng bộ từ điển", () => {
    // Mảnh từ điển thật (sheet "Quy chuẩn mã", 10 cột) đủ cho 14 mã mẫu bên dưới.
    const dict = buildCodeDictionary([
      {
        brand: "HONDA",
        brandCode: "H",
        model: "Air Blade",
        modelCode: "A",
        part: "Mặt nạ",
        partCode: "75",
        finish: "xi",
        finishCode: "X",
        color: "đỏ bóng",
        colorCode: "ĐOB",
      },
      {
        brand: "HONDA",
        brandCode: "H",
        model: "Click",
        modelCode: "CL",
        part: "Ốp tay dắt sau",
        partCode: "20",
        finish: "carbon",
        finishCode: "CB",
        color: "CTS1022",
        colorCode: "CTS1022",
      },
      {
        brand: "HONDA",
        brandCode: "H",
        model: "PCX",
        modelCode: "P",
        part: "Ốp bầu lọc gió",
        partCode: "12",
        finish: "PC",
        finishCode: "PC",
        color: "CTS1024",
        colorCode: "CTS1024",
      },
      {
        brand: "HONDA",
        brandCode: "H",
        model: "SH",
        modelCode: "S",
        part: "Thùng chứa đồ sau",
        partCode: "68D",
        finish: "phôi PP",
        finishCode: "PPH",
        color: "",
        colorCode: "",
      },
      {
        brand: "YAMAHA",
        brandCode: "Y",
        model: "Exciter",
        modelCode: "E",
        part: "Ốp phuộc trước",
        partCode: "14",
        finish: "",
        finishCode: "",
        color: "",
        colorCode: "",
      },
      {
        brand: "YAMAHA",
        brandCode: "Y",
        model: "NVX",
        modelCode: "NX",
        part: "Chắn bùn sau (theo xe)",
        partCode: "35B",
        finish: "",
        finishCode: "",
        color: "",
        colorCode: "",
      },
      {
        brand: "VUTRU",
        brandCode: "VT",
        model: "Winner R",
        modelCode: "WNR",
        part: "Ốp chắn gió mặt đồng hồ",
        partCode: "03",
        finish: "inox",
        finishCode: "I",
        color: "",
        colorCode: "",
      },
    ]);
    // Mã | Hãng | Dòng | Linh kiện | Xử lý | Ghi chú. 12 mã đầu lấy nguyên từ file "Danh mục
    // hàng hóa.xlsx" (sinh bằng công thức TRA_CUU); 2 mã cuối tự dựng để phủ đường xử lý 3 ký tự (PPH).
    const cases: Array<[string, string, string, string, string, string]> = [
      ["HA26-75-35-WRG-CB", "HONDA", "Air Blade", "Mặt nạ", "carbon", "OK"],
      ["ha26-75-37-wrg-cb", "HONDA", "Air Blade", "Mặt nạ", "carbon", "OK"],
      [
        "64200K57V50ZE",
        "",
        "",
        "",
        "",
        "Mã không theo quy chuẩn (không có dấu -)",
      ],
      [
        "VT-68DCTS1024-AS-PCĐO-CB",
        "VUTRU",
        "",
        "Thùng chứa đồ sau",
        "carbon",
        "Mã không ghi dòng xe.",
      ],
      [
        "EXT-155",
        "",
        "",
        "",
        "",
        "Hãng/dòng [EXT] không có trong quy chuẩn. Phần [155] không tách được linh kiện+màu. Không tìm được mã xử lý trong [155].",
      ],
      [
        "YE15-03MLSĐOB",
        "YAMAHA",
        "Exciter",
        "",
        "",
        "Phần [03MLSĐOB] không tách được linh kiện+màu. Không tìm được mã xử lý trong [03MLSĐOB].",
      ],
      [
        "HCL15-20X",
        "HONDA",
        "Click",
        "Ốp tay dắt sau",
        "xi",
        "OK (xử lý lấy từ ký tự cuối [X])",
      ],
      [
        "HP18-12PCT",
        "HONDA",
        "PCX",
        "",
        "",
        "Phần [12PCT] không tách được linh kiện+màu. Không tìm được mã xử lý trong [12PCT].",
      ],
      [
        "YNX-14X",
        "YAMAHA",
        "NVX",
        "Ốp phuộc trước",
        "xi",
        "OK (xử lý lấy từ ký tự cuối [X])",
      ],
      [
        "YH-2-XC",
        "",
        "",
        "",
        "",
        "Hãng/dòng [YH] không có trong quy chuẩn. Phần [2] không tách được linh kiện+màu. Không tìm được mã xử lý trong [XC].",
      ],
      [
        "YE15-35B",
        "YAMAHA",
        "Exciter",
        "Chắn bùn sau (theo xe)",
        "",
        "Không tìm được mã xử lý trong [35B].",
      ],
      [
        "HS17-75-0201-K4",
        "HONDA",
        "SH",
        "Mặt nạ",
        "",
        "Không tìm được mã xử lý trong [K4].",
      ],
      ["HA26-75ĐOB-PPH", "HONDA", "Air Blade", "Mặt nạ", "phôi PP", "OK"],
      // --RIGHT("N1.4",2) của Sheets coi ".4" là số → bỏ 2 ký tự "đời", khóa còn "N1".
      [
        "N1.4-6.3UNI",
        "",
        "",
        "",
        "inox",
        "Hãng/dòng [N1] không có trong quy chuẩn. Phần [6.3UN] không tách được linh kiện+màu.",
      ],
      [
        "HA-12CTS1024PPH",
        "HONDA",
        "Air Blade",
        "Ốp bầu lọc gió",
        "phôi PP",
        "OK (xử lý lấy từ ký tự cuối [PPH])",
      ],
    ];
    for (const [code, brand, model, part, finish, note] of cases) {
      const r = parseProductCode(code, dict);
      expect([r.brand, r.model, r.part, r.finish, r.note], code).toStrictEqual([
        brand,
        model,
        part,
        finish,
        note,
      ]);
    }
    const ok = parseProductCode("HCL15-20X", dict);
    expect(ok.status).toBe("ok");
    expect([
      ok.brandCode,
      ok.modelCode,
      ok.partCode,
      ok.finishCode,
    ]).toStrictEqual(["H", "CL", "20", "X"]);
    const bad = parseProductCode("YE15-35B", dict);
    expect(bad.status).toBe("invalid");
    expect(
      bad.issues.map((i) => i.field),
      "chỉ đoạn xử lý lệch — giao diện tô đúng ô đó",
    ).toStrictEqual(["finish"]);

    // Sheet nguồn: đúng 10 tiêu đề mới đọc; ô có dấu phẩy trong ngoặc kép; dòng trống bỏ.
    const header =
      "1.HÃNG XE,MÃ HÓA,2.DÒNG XE,MÃ HÓA,4.LINH KIỆN,MÃ HÓA,5.XỬ LÝ,MÃ HÓA,6.MÀU,MÃ HÓA";
    const rows = readSourceSheet(
      `${header}\r\nHONDA,H,Air Blade,A,"Ốp, chắn bùn",01,xi,X,đỏ bóng,ĐOB\r\n,,,,,,,,,\r\n,,,,Mặt nạ,75,,,,\r\n`,
    );
    expect(rows.length).toBe(2);
    expect(rows[0].part).toBe("Ốp, chắn bùn");
    expect(rows[1].partCode).toBe("75");
    expect(
      () => readSourceSheet("1.HÃNG XE,MÃ HÓA,2.DÒNG XE\nHONDA,H,A"),
      "thiếu cột: dừng, không đọc bừa",
    ).toThrow(SourceSheetError);
    expect(
      () =>
        readSourceSheet(
          header.replace("5.XỬ LÝ", "5.MÀU") + "\nHONDA,H,A,A,x,1,y,2,z,3",
        ),
      "đổi tên/đổi chỗ cột: báo đúng cột",
    ).toThrow(/cột 7.*5\.XỬ LÝ/);

    // Đồng bộ: dòng sheet → mục từ điển (mỗi mã giữ lần xuất hiện ĐẦU TIÊN, như MATCH).
    const source = [
      {
        brand: "HONDA",
        brandCode: "H",
        model: "Air Blade",
        modelCode: "A",
        part: "Mặt nạ",
        partCode: "75",
        finish: "xi",
        finishCode: "X",
        color: "đỏ bóng",
        colorCode: "ĐOB",
      },
      {
        brand: "HONDA",
        brandCode: "H",
        model: "SH",
        modelCode: "S",
        part: "Mặt nạ  trùng",
        partCode: "75",
        finish: "",
        finishCode: "",
        color: "",
        colorCode: "",
      },
      {
        brand: "",
        brandCode: "",
        model: "Wave Thái",
        modelCode: "WT",
        part: "",
        partCode: "",
        finish: "",
        finishCode: "",
        color: "",
        colorCode: "",
      },
    ];
    const entries = toSyncEntries(source);
    expect(
      entries.map((e) => `${e.loai}:${e.ma_hang ?? ""}:${e.ma}:${e.ten}`),
      "dòng thiếu mã hãng (Wave Thái) không tạo cặp — y như cột khóa của sheet CHUAN",
    ).toStrictEqual([
      "hang::H:HONDA",
      "dong:H:A:Air Blade",
      "linh_kien::75:Mặt nạ",
      "xu_ly::X:xi",
      "mau::ĐOB:đỏ bóng",
      "dong:H:S:SH",
    ]);
    // Dựng lại từ điển từ DB phải tách mã y như dựng thẳng từ sheet.
    const fromDb = dictionaryFromEntries(entries);
    const fromSheet = buildCodeDictionary(source);
    for (const code of ["HA26-75ĐOB-X", "HS-75X", "HWT-75-X"]) {
      expect(parseProductCode(code, fromDb), code).toStrictEqual(
        parseProductCode(code, fromSheet),
      );
    }
  });
});
