import { describe, expect, it } from "vitest";
import {
  periodRange,
  shiftPeriod,
  readPeriodFilter,
  writePeriodFilter,
  periodLabel,
  seriesStep,
  isCurrentPeriod,
} from "@/features/analytics/lib/period";

describe("period", () => {
  it("kỳ phân tích và bộ lọc trên URL (0099)", () => {
    // Kỳ: tuần bắt đầu thứ Hai; kỳ đang chạy cắt ở hôm nay; quý / năm đủ ngày.
    expect(periodRange("tuan", "2026-09-17", "2026-12-31")).toStrictEqual({
      from: "2026-09-14",
      to: "2026-09-20",
    });
    expect(
      periodRange("thang", "2026-10-20", "2026-10-05"),
      "tháng đang chạy cắt ở hôm nay",
    ).toStrictEqual({ from: "2026-10-01", to: "2026-10-05" });
    expect(periodRange("quy", "2026-08-02", "2026-12-31")).toStrictEqual({
      from: "2026-07-01",
      to: "2026-09-30",
    });
    expect(periodRange("nam", "2026-03-03", "2027-01-01")).toStrictEqual({
      from: "2026-01-01",
      to: "2026-12-31",
    });
    expect(
      shiftPeriod("thang", "2026-03-31", -1),
      "lùi tháng từ ngày 31 không nhảy sai tháng",
    ).toBe("2026-02-01");
    expect(shiftPeriod("quy", "2026-08-15", 1)).toBe("2026-10-01");
    expect(periodLabel("quy", "2026-08-15")).toBe("Quý 3/2026");
    expect(periodLabel("tuan", "2026-09-17")).toBe("Tuần 14/09 – 20/09/2026");
    expect(seriesStep("thang")).toBe("ngay");
    expect(seriesStep("quy")).toBe("tuan");
    expect(seriesStep("nam")).toBe("thang");
    expect(isCurrentPeriod("thang", "2026-10-01", "2026-10-05")).toBe(true);

    // URL: tham số tiếng Việt; dòng xe bị bỏ khi chưa chọn hãng; mốc về đầu kỳ.
    const f = readPeriodFilter(
      new URLSearchParams("ky=quy&moc=2026-08-15&hang=H&dong=VR&xu_ly=s1"),
      "2026-10-05",
    );
    expect(f.unit).toBe("quy");
    expect(f.anchor).toBe("2026-07-01");
    expect(f.modelCode).toBe("VR");
    expect(
      readPeriodFilter(new URLSearchParams("dong=VR"), "2026-10-05").modelCode,
      "dòng xe cần có hãng",
    ).toBe(null);
    expect(
      readPeriodFilter(new URLSearchParams("ky=xyz&moc=abc"), "2026-10-05")
        .unit,
      "giá trị lạ về mặc định",
    ).toBe("thang");
    const url = writePeriodFilter(f, new URLSearchParams("tab=phan-tich"));
    expect(url.get("tab"), "giữ tham số khác").toBe("phan-tich");
    expect(url.get("hang")).toBe("H");
  });
});
