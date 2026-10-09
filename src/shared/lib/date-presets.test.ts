import { describe, expect, it } from "vitest";
import {
  DATE_PRESET_LABELS,
  activeDatePreset,
  datePresetRange,
  isDefaultDateRange,
  readDateRangeOrThisMonth,
  todayInVietnam,
} from "@/shared/lib/date-presets";
import { readDate } from "@/features/documents/lib/url-filter";

describe("date-presets", () => {
  it("khoảng ngày cài sẵn và mặc định tháng này (Phase 20, UI3B-06)", () => {
    expect(
      todayInVietnam(new Date(Date.UTC(2026, 9, 3, 18, 30))),
      "01:30 sáng VN",
    ).toBe("2026-10-04");
    expect(datePresetRange("7d", "2026-10-04")).toStrictEqual({
      fromDate: "2026-09-28",
      toDate: "2026-10-04",
    });
    expect(datePresetRange("30d", "2026-10-04")).toStrictEqual({
      fromDate: "2026-09-05",
      toDate: "2026-10-04",
    });
    expect(datePresetRange("month", "2026-10-04")).toStrictEqual({
      fromDate: "2026-10-01",
      toDate: "2026-10-04",
    });
    // Bộ lọc danh sách: URL chưa chọn ngày → tháng này; tháng này không tính là đang lọc.
    expect(
      readDateRangeOrThisMonth(new URLSearchParams(""), readDate, "2026-10-05"),
    ).toStrictEqual({ fromDate: "2026-10-01", toDate: "2026-10-05" });
    expect(
      readDateRangeOrThisMonth(
        new URLSearchParams("tu_ngay=01/09/2026"),
        readDate,
        "2026-10-05",
      ),
      "có tham số sai thì không tự thay",
    ).toStrictEqual({ fromDate: null, toDate: null });
    expect(isDefaultDateRange("2026-10-01", "2026-10-05", "2026-10-05")).toBe(
      true,
    );
    expect(isDefaultDateRange("2026-09-01", "2026-09-30", "2026-10-05")).toBe(
      false,
    );
    expect(datePresetRange("7d", "2026-03-03")).toStrictEqual({
      fromDate: "2026-02-25",
      toDate: "2026-03-03",
    });
    expect(activeDatePreset(null, null, "2026-10-04")).toBe(null);
    expect(activeDatePreset("2026-09-28", "2026-10-04", "2026-10-04")).toBe(
      "7d",
    );
    expect(activeDatePreset("2026-10-01", "2026-10-04", "2026-10-04")).toBe(
      "month",
    );
    expect(activeDatePreset("2026-09-01", "2026-09-15", "2026-10-04")).toBe(
      "custom",
    );
    expect(DATE_PRESET_LABELS).toStrictEqual({
      "7d": "7N",
      "30d": "30N",
      month: "Tháng",
      custom: "Tùy",
    });
  });
});
