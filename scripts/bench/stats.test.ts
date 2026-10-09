import { describe, expect, it } from "vitest";

import {
  compareRuns,
  renderCompareMarkdown,
  renderRunMarkdown,
  summarize,
  type BenchCaseResult,
  type BenchRun,
} from "./stats";

function makeCase(
  id: string,
  role: BenchCaseResult["role"],
  samplesMs: number[],
  status: BenchCaseResult["status"] = "ok",
): BenchCaseResult {
  return {
    id,
    rpc: id.split(".")[0] ?? id,
    role,
    params: {},
    status,
    samplesMs,
    rows: 3,
    summary: summarize(samplesMs),
  };
}

function makeRun(label: string, cases: BenchCaseResult[]): BenchRun {
  return {
    label,
    createdAt: "2026-10-09T00:00:00.000Z",
    gitSha: "abc1234",
    latestMigration: "0123_x.sql",
    iterations: 5,
    scale: { kho_movement: 1000 },
    cases,
  };
}

describe("summarize", () => {
  it("tính p50, p95, max, mean theo nearest-rank", () => {
    expect(summarize([5, 1, 3, 2, 4])).toEqual({
      n: 5,
      p50: 3,
      p95: 5,
      max: 5,
      mean: 3,
    });
  });

  it("một phần tử thì p50 = p95 = max", () => {
    expect(summarize([7])).toEqual({ n: 1, p50: 7, p95: 7, max: 7, mean: 7 });
  });

  it("mảng rỗng trả về null", () => {
    expect(summarize([])).toEqual({
      n: 0,
      p50: null,
      p95: null,
      max: null,
      mean: null,
    });
  });

  it("làm tròn một chữ số thập phân", () => {
    expect(summarize([1.234, 2.345]).mean).toBe(1.8);
  });
});

describe("compareRuns", () => {
  it("tính phần trăm chênh p50 và p95, làm tròn 1 chữ số", () => {
    const a = makeRun("a", [makeCase("x.y", "quan_ly", [100, 100, 200])]);
    const b = makeRun("b", [makeCase("x.y", "quan_ly", [50, 50, 100])]);

    const [row] = compareRuns(a, b);

    expect(row?.deltaP50Pct).toBe(-50);
    expect(row?.deltaP95Pct).toBe(-50);
  });

  it("ghép theo id và vai trò; ca chỉ có một bên để null", () => {
    const a = makeRun("a", [
      makeCase("x", "quan_ly", [10]),
      makeCase("x", "thu_kho", [10]),
    ]);
    const b = makeRun("b", [
      makeCase("x", "quan_ly", [20]),
      makeCase("moi", "quan_ly", [5]),
    ]);

    const rows = compareRuns(a, b);

    expect(rows).toHaveLength(3);
    const onlyA = rows.find((r) => r.id === "x" && r.role === "thu_kho");
    expect(onlyA?.b).toBeNull();
    expect(onlyA?.deltaP50Pct).toBeNull();
    const onlyB = rows.find((r) => r.id === "moi");
    expect(onlyB?.a).toBeNull();
  });
});

describe("renderCompareMarkdown", () => {
  it("có dòng tiêu đề theo nhãn, hiển thị — và timeout", () => {
    const a = makeRun("truoc", [
      makeCase("t", "quan_ly", [8000], "timeout"),
      makeCase("chi-a", "quan_ly", [10]),
    ]);
    const b = makeRun("sau", [makeCase("t", "quan_ly", [40])]);

    const md = renderCompareMarkdown(compareRuns(a, b), a, b);

    expect(md).toContain(
      "| Ca | Vai trò | p50 truoc | p50 sau | Δ p50 | p95 truoc | p95 sau | Δ p95 |",
    );
    expect(md).toContain("timeout (8s)");
    expect(md).toContain("—");
    expect(md).toContain("kho_movement");
  });
});

describe("renderRunMarkdown", () => {
  it("liệt kê từng ca kèm trạng thái và quy mô", () => {
    const run = makeRun("lan-1", [
      makeCase("x.y", "quan_ly", [1, 2, 3]),
      makeCase("z", "thu_kho", [], "skipped"),
    ]);

    const md = renderRunMarkdown(run);

    expect(md).toContain("lan-1");
    expect(md).toContain("| Ca | Vai trò | Trạng thái | p50 | p95 | max | Số dòng |");
    expect(md).toContain("skipped");
    expect(md).toContain("1000");
  });
});
