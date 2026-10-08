import { describe, expect, it } from "vitest";
import { fetchAllPages } from "@/shared/lib/fetch-all-pages";

describe("fetchAllPages", () => {
  it("tải nhiều trang vì PostgREST cắt ở max_rows", async () => {
    // PostgREST cắt mỗi lần gọi ở max_rows = 1000 (supabase/config.toml) — 3.266
    // mã phải tải nhiều trang. Hàm dừng khi trang trả về ít hơn kích thước trang.
    const goi: Array<[number, number]> = [];
    const all = await fetchAllPages(async (from, to) => {
      goi.push([from, to]);
      return Array.from(
        { length: Math.max(0, Math.min(to, 2499) - from + 1) },
        (_, i) => from + i,
      );
    }, 1000);
    expect(all.length, "ghép đủ 2.500 dòng qua 3 trang").toBe(2500);
    expect(goi, "gọi đúng ba khoảng, dừng ở trang thiếu").toStrictEqual([
      [0, 999],
      [1000, 1999],
      [2000, 2999],
    ]);
    expect(
      (await fetchAllPages(async () => [], 1000)).length,
      "không có dòng nào: một lần gọi, mảng rỗng",
    ).toBe(0);
  });
});
