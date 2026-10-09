import { describe, expect, it } from "vitest";

import {
  addDays,
  FIVE_YEARS_DAYS,
  groupByMonth,
  horizonStart,
  parseSeedArgs,
  seedDays,
  vnToday,
} from "./seed-args";

describe("parseSeedArgs", () => {
  it("mặc định 5 năm = 1826 ngày", () => {
    expect(parseSeedArgs([])).toEqual({ days: 1826, dryRun: false });
    expect(FIVE_YEARS_DAYS).toBe(1826);
  });

  it("--years và --days", () => {
    expect(parseSeedArgs(["--years", "5"]).days).toBe(1826);
    expect(parseSeedArgs(["--days", "99"]).days).toBe(99);
  });

  it("--dry-run", () => {
    expect(parseSeedArgs(["--dry-run"]).dryRun).toBe(true);
  });

  it.each([["0"], ["4000"], ["abc"], ["1.5"]])("từ chối --days %s", (n) => {
    expect(() => parseSeedArgs(["--days", n])).toThrow(/1 đến 3660/);
  });
});

describe("vnToday", () => {
  it("quy đổi sang ngày giờ Việt Nam", () => {
    expect(vnToday(new Date("2026-10-08T17:30:00Z"))).toBe("2026-10-09");
    expect(vnToday(new Date("2026-10-08T16:59:59Z"))).toBe("2026-10-08");
  });
});

describe("seedDays / addDays", () => {
  it("tăng dần và kết thúc hôm nay", () => {
    expect(seedDays("2026-10-09", 3)).toEqual([
      "2026-10-07",
      "2026-10-08",
      "2026-10-09",
    ]);
    expect(seedDays("2026-10-09", 99)).toHaveLength(99);
  });

  it("addDays qua ranh giới tháng và năm nhuận", () => {
    expect(addDays("2024-03-01", -1)).toBe("2024-02-29");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
});

describe("groupByMonth", () => {
  it("gom theo tháng, giữ thứ tự", () => {
    const grouped = groupByMonth(["2026-09-30", "2026-10-01", "2026-10-02"]);
    expect([...grouped.keys()]).toEqual(["2026-09", "2026-10"]);
    expect(grouped.get("2026-09")).toHaveLength(1);
    expect(grouped.get("2026-10")).toHaveLength(2);
  });
});

describe("horizonStart", () => {
  it("cố định theo 5 năm khi chạy ít ngày hơn", () => {
    expect(horizonStart("2026-10-09", 99)).toBe(addDays("2026-10-09", -1826));
    expect(horizonStart("2026-10-09", 99)).toBe("2021-10-09");
  });

  it("lùi xa hơn khi days > 5 năm", () => {
    expect(horizonStart("2026-10-09", 2000)).toBe(addDays("2026-10-09", -2000));
  });
});
