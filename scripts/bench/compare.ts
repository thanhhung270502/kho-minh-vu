import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";

import { BENCH_DIR } from "./local-env";
import { compareRuns, renderCompareMarkdown, type BenchRun } from "./stats";

function loadRun(label: string): BenchRun {
  const path = `${BENCH_DIR}/${label}.json`;
  if (!existsSync(path)) {
    throw new Error(
      `Không thấy ${path} — chạy npm run bench:run -- --label ${label} trước`,
    );
  }
  return JSON.parse(readFileSync(path, "utf8")) as BenchRun;
}

function main(): void {
  const [labelA, labelB] = process.argv.slice(2);
  if (!labelA || !labelB) {
    throw new Error("Cách dùng: npm run bench:compare -- <nhanA> <nhanB>");
  }
  const a = loadRun(labelA);
  const b = loadRun(labelB);
  const markdown = renderCompareMarkdown(compareRuns(a, b), a, b);
  mkdirSync(BENCH_DIR, { recursive: true });
  const out = `${BENCH_DIR}/compare-${labelA}-vs-${labelB}.md`;
  writeFileSync(out, markdown);
  process.stdout.write(markdown);
  process.stdout.write(`\nĐã lưu ${out}\n`);
}

try {
  main();
} catch (e) {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
}
