import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRODUCT_FILTER,
  countActiveFilters,
  readFilterFromUrl,
  writeFilterToUrl,
  toListRpcArgs,
  type ProductFilter,
} from "@/features/products/schemas/filter.schema";

describe("filter.schema (danh mục)", () => {
  it("bộ lọc quay vòng qua URL, quy chuẩn, hình ảnh (Phase 9, 09-08)", () => {
    const sampleFilter: ProductFilter = {
      q: "op po",
      categoryId: "11111111-1111-4111-8111-111111111111",
      stageId: null,
      unitId: null,
      stockStatus: "duoi_dinh_muc",
      tradingStatus: "inactive",
      standard: "thieu",
      hasImage: "without",
      sortBy: "totalStock",
      sortDir: "desc",
      page: 3,
      pageSize: 100,
    };

    expect(
      readFilterFromUrl(writeFilterToUrl(sampleFilter)),
      "bộ lọc quay vòng qua URL không mất giá trị",
    ).toStrictEqual(sampleFilter);
    expect(
      writeFilterToUrl(DEFAULT_PRODUCT_FILTER).toString(),
      "bộ lọc mặc định không ghi gì vào URL",
    ).toBe("");
    expect(readFilterFromUrl(new URLSearchParams(""))).toStrictEqual(
      DEFAULT_PRODUCT_FILTER,
    );
    expect(
      readFilterFromUrl(new URLSearchParams("trang=-5")).page,
      "page âm về 1",
    ).toBe(1);
    expect(
      readFilterFromUrl(new URLSearchParams("kich_thuoc=99999")).pageSize,
      "kích thước page bị chặn trần",
    ).toBe(200);
    expect(
      readFilterFromUrl(new URLSearchParams("sap_xep=drop")).sortBy,
      "cột sắp xếp lạ bị bỏ",
    ).toBe(null);
    expect(
      readFilterFromUrl(new URLSearchParams("nhom=khong-phai-uuid")).categoryId,
      "nhóm không phải uuid bị bỏ",
    ).toBe(null);
    expect(
      toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, tradingStatus: "all" })
        .p_dang_kinh_doanh,
      "lọc tất cả gửi null tường minh, không bỏ trống",
    ).toBe(null);
    expect(toListRpcArgs(DEFAULT_PRODUCT_FILTER).p_dang_kinh_doanh).toBe(true);
    // --- Bộ lọc "Quy chuẩn" (quy chuẩn mã phần A) thay nút "Cần rà" -------------
    expect(
      toListRpcArgs(DEFAULT_PRODUCT_FILTER).p_quy_chuan,
      "không lọc quy chuẩn thì bỏ trống",
    ).toBe(undefined);
    expect(
      toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, standard: "chon_tay" })
        .p_quy_chuan,
    ).toBe("chon_tay");
    expect(
      toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, standard: "du" }).p_can_ra,
      "không còn gửi p_can_ra",
    ).toBe(undefined);
    expect(
      readFilterFromUrl(new URLSearchParams("quy_chuan=du")).standard,
    ).toBe("du");
    expect(
      readFilterFromUrl(new URLSearchParams("quy_chuan=xyz")).standard,
      "giá trị quy chuẩn lạ bị bỏ",
    ).toBe(null);
    expect(
      readFilterFromUrl(new URLSearchParams("can_ra=1")).standard,
      "link cũ ?can_ra=1 không còn lọc",
    ).toBe(null);
    expect(
      !("p_can_ra" in toListRpcArgs(sampleFilter)),
      "không gửi p_can_ra kể cả khi có lọc khác",
    ).toBeTruthy();

    // --- Bộ lọc "Hình ảnh" (Phase 9, 09-08, D-18, ANH-04) ----------------------
    expect(
      readFilterFromUrl(new URLSearchParams("anh=co")).hasImage,
      "?anh=co đọc thành with",
    ).toBe("with");
    expect(
      readFilterFromUrl(new URLSearchParams("anh=chua")).hasImage,
      "?anh=chua đọc thành without",
    ).toBe("without");
    expect(
      readFilterFromUrl(new URLSearchParams("anh=xyz")).hasImage,
      "giá trị anh lạ bị bỏ",
    ).toBe(null);
    expect(
      readFilterFromUrl(new URLSearchParams("")).hasImage,
      "không có khóa anh thì null",
    ).toBe(null);
    expect(
      writeFilterToUrl({ ...DEFAULT_PRODUCT_FILTER, hasImage: "with" }).get(
        "anh",
      ),
      "hasImage with ghi ?anh=co",
    ).toBe("co");
    expect(
      writeFilterToUrl({ ...DEFAULT_PRODUCT_FILTER, hasImage: "without" }).get(
        "anh",
      ),
      "hasImage without ghi ?anh=chua",
    ).toBe("chua");
    expect(
      toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, hasImage: "with" }).p_co_anh,
      "hasImage with -> p_co_anh true",
    ).toBe(true);
    expect(
      toListRpcArgs({ ...DEFAULT_PRODUCT_FILTER, hasImage: "without" })
        .p_co_anh,
      "hasImage without -> p_co_anh false",
    ).toBe(false);
    expect(
      toListRpcArgs(DEFAULT_PRODUCT_FILTER).p_co_anh,
      "hasImage mặc định null -> p_co_anh undefined",
    ).toBe(undefined);
    expect(
      countActiveFilters({ ...DEFAULT_PRODUCT_FILTER, hasImage: "without" }),
      "ô Hình ảnh tính vào số điều kiện đang bật",
    ).toBe(1);
  });
});
