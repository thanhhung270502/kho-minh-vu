import { describe, expect, it } from "vitest";
import { datePresetRange, todayInVietnam } from "@/shared/lib/date-presets";
import {
  DEFAULT_RECEIPT_FILTER,
  countActiveReceiptFilters,
  readReceiptFilterFromUrl,
  writeReceiptFilterToUrl,
  toReceiptListRpcArgs,
  type ReceiptFilter,
} from "@/features/stock-in/schemas/receipt.schema";

describe("receipt.schema", () => {
  it("bộ lọc phiếu nhập (Phase 3)", () => {
    const sampleReceiptFilter: ReceiptFilter = {
      q: "PN26",
      status: "HOAN_THANH",
      partnerId: "11111111-1111-4111-8111-111111111111",
      warehouseId: "22222222-2222-4222-8222-222222222222",
      source: "NHA_MAY",
      fromDate: "2026-09-01",
      toDate: "2026-09-30",
      page: 3,
    };

    expect(
      readReceiptFilterFromUrl(writeReceiptFilterToUrl(sampleReceiptFilter)),
      "bộ lọc phiếu nhập quay vòng qua URL không mất giá trị",
    ).toStrictEqual(sampleReceiptFilter);
    expect(
      writeReceiptFilterToUrl(DEFAULT_RECEIPT_FILTER).toString(),
      "bộ lọc mặc định không ghi gì vào URL",
    ).toBe("");
    expect(
      readReceiptFilterFromUrl(new URLSearchParams("")),
      "URL chưa chọn ngày → mặc định tháng này",
    ).toStrictEqual({
      ...DEFAULT_RECEIPT_FILTER,
      ...datePresetRange("month", todayInVietnam()),
    });
    expect(
      writeReceiptFilterToUrl({
        ...DEFAULT_RECEIPT_FILTER,
        ...datePresetRange("month", todayInVietnam()),
      }).toString(),
      "tháng này là mặc định — không ghi lên URL",
    ).toBe("");
    expect(
      countActiveReceiptFilters({
        ...DEFAULT_RECEIPT_FILTER,
        ...datePresetRange("month", todayInVietnam()),
      }),
      "tháng này không tính là đang lọc",
    ).toBe(0);
    expect(
      readReceiptFilterFromUrl(new URLSearchParams("trang=-2")).page,
      "page âm về 1",
    ).toBe(1);
    expect(
      readReceiptFilterFromUrl(new URLSearchParams("ncc=khong-phai-uuid"))
        .partnerId,
    ).toBe(null);
    expect(
      readReceiptFilterFromUrl(new URLSearchParams("tu_ngay=01/09/2026"))
        .fromDate,
      "ngày sai định dạng bị bỏ",
    ).toBe(null);
    expect(
      countActiveReceiptFilters(DEFAULT_RECEIPT_FILTER),
      "không điều kiện nào thì đếm 0",
    ).toBe(0);
    expect(
      countActiveReceiptFilters(sampleReceiptFilter),
      "khoảng ngày tính là MỘT điều kiện",
    ).toBe(5);
    expect(
      countActiveReceiptFilters({ ...DEFAULT_RECEIPT_FILTER, q: "tìm gì đó" }),
      "ô tìm KHÔNG tính vào số điều kiện của panel lọc",
    ).toBe(0);
    expect(
      toReceiptListRpcArgs(DEFAULT_RECEIPT_FILTER).p_loai_ct,
      "màn phiếu nhập luôn khóa loại NHAP",
    ).toBe("NHAP");
  });
});
