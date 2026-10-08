import { describe, expect, it } from "vitest";
import {
  toGlobalSearchResult,
  type GlobalSearchResult,
} from "@/features/global-search/types";
import {
  defaultActiveIndex,
  groupSearchResults,
  searchResultHref,
} from "@/features/global-search/lib/search-results";

describe("search-results", () => {
  it("tìm kiếm toàn cục (Phase 20, UI3B-02)", () => {
    const row = (loai: string, id: string, nhan: string) =>
      ({
        loai,
        id,
        nhan,
        phu: "Bạc đạn",
        loai_ct: null,
        trang_thai: null,
        xep_hang: 0,
      }) as unknown as Parameters<typeof toGlobalSearchResult>[0];
    expect(toGlobalSearchResult(row("san_pham", "p1", "ABC"))).toStrictEqual({
      key: "product:p1",
      kind: "product",
      id: "p1",
      label: "ABC",
      hint: "Bạc đạn",
      documentType: null,
      status: null,
      rank: 0,
    });
    expect(toGlobalSearchResult(row("x", "p1", "ABC")), "loại lạ bị bỏ").toBe(
      null,
    );

    const r = (
      kind: GlobalSearchResult["kind"],
      id: string,
      label = "L",
      documentType: string | null = null,
    ): GlobalSearchResult => ({
      key: `${kind}:${id}`,
      kind,
      id,
      label,
      hint: null,
      documentType,
      status: null,
      rank: 0,
    });
    expect(searchResultHref(r("product", "p1"))).toBe("/danh-muc/p1");
    expect(searchResultHref(r("order", "o1"))).toBe("/don-dat/o1");
    expect(searchResultHref(r("partner", "x", "Liên Hoa"))).toBe(
      "/doi-tac?q=Li%C3%AAn%20Hoa",
    );
    expect(searchResultHref(r("document", "d1", "L", "NHAP"))).toBe(
      "/nhap-hang/d1",
    );
    expect(searchResultHref(r("document", "d1", "L", "XUAT"))).toBe(
      "/duyet-don/d1",
    );
    expect(searchResultHref(r("document", "d1", "L", "TRA_NCC"))).toBe(
      "/tra-hang/d1",
    );
    expect(searchResultHref(r("document", "d1", "L", "TRA_KHACH"))).toBe(
      "/tra-hang/d1",
    );
    expect(searchResultHref(r("document", "d1", "L", "KIEM_KE"))).toBe(
      "/kiem-ke/d1",
    );
    expect(searchResultHref(r("document", "d1", "L", "CHUYEN_KHO"))).toBe(null);

    const groups = groupSearchResults([
      r("order", "o"),
      r("product", "p"),
      r("partner", "t"),
    ]);
    expect(
      groups.map((g) => g.title),
      "thứ tự nhóm, bỏ nhóm rỗng",
    ).toStrictEqual(["Mã hàng", "Đơn đặt", "Đối tác"]);
    expect(
      defaultActiveIndex([{ label: "ABC1" }, { label: "ABC" }], " abc "),
    ).toBe(1);
    expect(
      defaultActiveIndex([{ label: "ABC1" }, { label: "ABD" }], "abc"),
    ).toBe(0);
    expect(defaultActiveIndex([], "abc")).toBe(-1);
  });
});
