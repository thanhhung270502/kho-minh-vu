import { describe, expect, it } from "vitest";
import { duplicateProblemsInFile } from "@/features/products/lib/new-product-file";

describe("new-product-file", () => {
  it("trùng mã / tên trong file nhập mã mới (Phase 15, IMP-03)", () => {
    const rows = [
      { row: 2, code: "BT-01", name: "Bố thắng" },
      { row: 3, code: "bt-01", name: "Nhông" },
      { row: 4, code: "X-01", name: "  bo  THANG " },
      { row: 5, code: "C-01", name: "Căm" },
    ];
    const problems = duplicateProblemsInFile(rows);
    expect(
      problems.get(2),
      "so mã không phân biệt hoa thường, tên không dấu + gộp khoảng trắng",
    ).toStrictEqual(["Mã hàng trùng với dòng 3", "Tên hàng trùng với dòng 4"]);
    expect(problems.get(3)).toStrictEqual(["Mã hàng trùng với dòng 2"]);
    expect(problems.get(4)).toStrictEqual(["Tên hàng trùng với dòng 2"]);
    expect(problems.get(5), "dòng không trùng không có lỗi").toBe(undefined);
  });
});
