import { describe, expect, it } from "vitest";
import { readFilterFromUrl } from "@/features/products/schemas/filter.schema";
import {
  buildCatalogDrilldownUrl,
  type StockGroupBy,
} from "@/features/dashboard/lib/stock-drilldown";

describe("stock-drilldown", () => {
  it("drill-down từ tổng quan sang Danh sách hàng hóa (Phase 10)", () => {
    const groupId = "44444444-4444-4444-8444-444444444444";
    expect(
      buildCatalogDrilldownUrl({
        groupBy: "category" as StockGroupBy,
        groupId,
        stockStatus: "am",
      }),
      "drill-down theo nhóm hàng + trạng thái âm",
    ).toBe(`/danh-muc?nhom=${groupId}&ton=am`);

    const stageUrl = buildCatalogDrilldownUrl({
      groupBy: "stage",
      groupId,
      stockStatus: "duoi_dinh_muc",
    });
    const stageParams = new URLSearchParams(stageUrl.split("?")[1]);
    expect(stageUrl.startsWith("/danh-muc?")).toBeTruthy();
    expect(stageParams.get("cong_doan")).toBe(groupId);
    expect(stageParams.get("ton")).toBe("duoi_dinh_muc");
    expect(
      stageParams.get("kinh_doanh"),
      "không đặt kinh_doanh, dùng mặc định 'đang kinh doanh'",
    ).toBe(null);
    expect(stageParams.get("nhom"), "groupBy=stage không được kèm nhom").toBe(
      null,
    );

    expect(
      buildCatalogDrilldownUrl({
        groupBy: "category",
        groupId,
        stockStatus: null,
      }),
      "cột 'Tổng mã' không có stockStatus thì không có ?ton=",
    ).toBe(`/danh-muc?nhom=${groupId}`);

    const roundTrip = readFilterFromUrl(
      new URLSearchParams(stageUrl.split("?")[1]),
    );
    expect(roundTrip.stageId).toBe(groupId);
    expect(roundTrip.stockStatus).toBe("duoi_dinh_muc");
    expect(
      roundTrip.tradingStatus,
      "URL drill-down luôn quay vòng về 'đang kinh doanh'",
    ).toBe("active");
  });
});
