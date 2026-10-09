import { describe, expect, it } from "vitest";
import { parseImageCell, buildCopyPlan } from "./parse-image-cell";

describe("parse-image-cell", () => {
  it("đọc ô ảnh KiotViet và dựng kế hoạch chép (09-12)", () => {
    expect(parseImageCell(null), "null trả mảng rỗng").toStrictEqual([]);
    expect(parseImageCell(""), "chuỗi rỗng trả mảng rỗng").toStrictEqual([]);
    expect(
      parseImageCell("https://cdn2-retail-images.kiotviet.vn/a.jpg"),
      "một URL hợp lệ",
    ).toStrictEqual(["https://cdn2-retail-images.kiotviet.vn/a.jpg"]);
    expect(
      parseImageCell(" https://x/a.jpg , https://x/b.jpg,https://x/a.jpg "),
      "trim, giữ thứ tự, bỏ trùng",
    ).toStrictEqual(["https://x/a.jpg", "https://x/b.jpg"]);
    expect(
      parseImageCell("abc, ftp://x/y.jpg, https://x/c.jpg"),
      "chỉ nhận http/https",
    ).toStrictEqual(["https://x/c.jpg"]);

    const plan = buildCopyPlan(
      [
        { code: "A", urls: ["u1", "u2"] },
        { code: "ZZ", urls: ["u3"] },
        { code: "B", urls: [] },
      ],
      new Map([
        ["A", "id-a"],
        ["B", "id-b"],
      ]),
      new Set(["id-a|u1"]),
    );
    expect(
      plan.jobs,
      "chỉ còn ảnh chưa chép, order theo vị trí trong ô",
    ).toStrictEqual([
      { productId: "id-a", productCode: "A", url: "u2", order: 1 },
    ]);
    expect(plan.unknownCodes, "mã không khớp danh mục").toStrictEqual(["ZZ"]);
    expect(plan.alreadyCopied, "đã chép trước đó").toBe(1);
    expect(plan.productsWithImages, "mã B không có url không tính").toBe(2);
    expect(plan.totalImages, "tổng số ảnh trong các dòng có url").toBe(3);

    const planCaseInsensitive = buildCopyPlan(
      [{ code: " a ", urls: ["u1"] }],
      new Map([["A", "id-a"]]),
      new Set(),
    );
    expect(
      planCaseInsensitive.jobs,
      "mã so khớp không phân biệt hoa thường và trim",
    ).toStrictEqual([
      { productId: "id-a", productCode: " a ", url: "u1", order: 0 },
    ]);
  });
});
