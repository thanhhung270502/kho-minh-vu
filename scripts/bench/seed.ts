import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { readLocalSupabase, runPsql } from "./local-env";
import {
  groupByMonth,
  horizonStart,
  parseSeedArgs,
  seedDays,
  vnToday,
} from "./seed-args";

type DayResult = {
  ngay: string;
  bo_qua: boolean;
  nhap?: number;
  don?: number;
  hoa_don?: number;
  huy?: number;
  xuat_am?: number;
  tra?: number;
  dieu_chinh?: number;
  kiem_ke?: number;
  dong_so_cai?: number;
};

const DAY_SQL = path.resolve("scripts/bench/seed/day.sql");
const fmt = (n: number): string => n.toLocaleString("vi-VN");

function formatDuration(seconds: number): string {
  if (seconds < 90) return `${Math.round(seconds)}s`;
  const minutes = Math.round(seconds / 60);
  if (minutes < 120) return `${minutes} phút`;
  return `${(minutes / 60).toFixed(1)} giờ`;
}

function monthScript(days: string[]): string {
  const calls = days.map((d) => `select pg_temp.bench_seed_day('${d}'::date);`);
  return [
    "\\set ON_ERROR_STOP on",
    "set client_min_messages = warning;",
    `\\i ${DAY_SQL}`,
    "begin;",
    // Ghi sổ xong mới cần bền vững; mất điện giữa lô thì cả lô làm lại từ đầu.
    "set local synchronous_commit = off;",
    "select set_config('app.nguon_sua','form',true) \\g /dev/null",
    "select pg_temp.bench_snapshot_counters() \\g /dev/null",
    ...calls,
    "select pg_temp.bench_restore_counters() \\g /dev/null",
    "commit;",
    // Không analyze thì planner còn thống kê của bảng rỗng và các tháng đầu chạy chậm gấp 3-4 lần.
    "analyze public.kho_movement, public.chung_tu, public.chung_tu_dong, public.ton_kho, public.don_dat_hang, public.don_dat_hang_dong;",
    "",
  ].join("\n");
}

function parseResults(output: string): DayResult[] {
  return output
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("{"))
    .map((line) => JSON.parse(line) as DayResult);
}

function main(): void {
  const startedAt = Date.now();
  const { days, dryRun } = parseSeedArgs(process.argv.slice(2));
  const env = readLocalSupabase();
  const host = new URL(env.dbUrl).host;

  const today = vnToday();
  const all = seedDays(today, days);
  const months = groupByMonth(all);
  const from = all[0] ?? today;
  const mocTon = horizonStart(today, days);

  console.log(
    `Sinh dữ liệu BENCH trên ${host} — ${fmt(days)} ngày (${from} → ${today})`,
  );

  if (dryRun) {
    console.log(
      `[dry-run] ${fmt(days)} ngày, ${fmt(months.size)} tháng, tồn đầu kỳ ghi ngày ${mocTon}. Không kết nối DB.`,
    );
    return;
  }

  runPsql(env.dbUrl, {
    file: "scripts/bench/seed/catalog.sql",
    vars: { ngay_dau: mocTon },
  });

  const workDir = mkdtempSync(path.join(tmpdir(), "bench-seed-"));
  const totals = { days: 0, skipped: 0, ledger: 0 };
  let batchSeconds = 0;
  let processedDays = 0;

  try {
    for (const [month, monthDays] of months) {
      const file = path.join(workDir, `${month}.sql`);
      writeFileSync(file, monthScript(monthDays));
      const monthStart = Date.now();

      let results: DayResult[];
      try {
        results = parseResults(
          runPsql(env.dbUrl, { file, args: ["-A", "-t"], capture: true }),
        );
      } catch (error) {
        throw new Error(
          `Tháng ${month} lỗi (các tháng trước đã commit, chạy lại sẽ làm tiếp): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      const done = results.filter((r) => !r.bo_qua);
      const sum = (pick: (r: DayResult) => number | undefined): number =>
        done.reduce((acc, r) => acc + (pick(r) ?? 0), 0);
      const seconds = (Date.now() - monthStart) / 1000;
      totals.days += done.length;
      totals.skipped += results.length - done.length;
      totals.ledger += sum((r) => r.dong_so_cai);

      if (done.length > 0) {
        batchSeconds += seconds;
        processedDays += done.length;
      }
      const lastDay = monthDays[monthDays.length - 1] ?? "";
      const remainingDays = all.length - 1 - all.indexOf(lastDay);
      const perDay = processedDays > 0 ? batchSeconds / processedDays : 0;
      const eta =
        perDay > 0 && remainingDays > 0
          ? ` · còn ~${formatDuration(perDay * remainingDays)}`
          : "";

      console.log(
        `[${month}] ${fmt(done.length)} ngày (${fmt(results.length - done.length)} bỏ qua) · ` +
          `${fmt(sum((r) => r.hoa_don))} HĐ · ${fmt(sum((r) => r.nhap))} PN · ` +
          `${fmt(sum((r) => r.huy))} hủy · ${fmt(sum((r) => r.dong_so_cai))} dòng sổ cái · ` +
          `${Math.round(seconds)}s · tổng ${fmt(totals.ledger)}${eta}`,
      );
    }

    // Phiên kiểm kê mở cho 22-03 (đo bang_dem_kiem_ke) — cùng quy tắc trả lại bộ đếm.
    const sessionFile = path.join(workDir, "open-session.sql");
    writeFileSync(
      sessionFile,
      [
        "\\set ON_ERROR_STOP on",
        "set client_min_messages = warning;",
        `\\i ${DAY_SQL}`,
        "begin;",
        "select pg_temp.bench_snapshot_counters() \\g /dev/null",
        "select pg_temp.bench_ensure_open_session() \\g /dev/null",
        "select pg_temp.bench_restore_counters() \\g /dev/null",
        "commit;",
        "",
      ].join("\n"),
    );
    runPsql(env.dbUrl, { file: sessionFile });
  } finally {
    rmSync(workDir, { recursive: true, force: true });
  }

  // Thống kê planner phải mới trước khi đo.
  runPsql(env.dbUrl, {
    sql: "vacuum analyze public.kho_movement, public.chung_tu, public.chung_tu_dong, public.don_dat_hang, public.don_dat_hang_dong, public.nhat_ky_sua, public.ton_kho, public.san_pham",
  });

  const counts = runPsql(env.dbUrl, {
    args: ["-A", "-t", "-F", "|"],
    capture: true,
    sql: [
      "select 'kho_movement', count(*) from public.kho_movement",
      "union all select 'chung_tu', count(*) from public.chung_tu",
      "union all select 'chung_tu_dong', count(*) from public.chung_tu_dong",
      "union all select 'don_dat_hang', count(*) from public.don_dat_hang",
      "union all select 'don_dat_hang_dong', count(*) from public.don_dat_hang_dong",
      "union all select 'nhat_ky_sua', count(*) from public.nhat_ky_sua",
    ].join(" "),
  });

  console.log("\nSố dòng hiện có:");
  for (const line of counts.split("\n").filter((l) => l.includes("|"))) {
    const [table = "", count = "0"] = line.split("|");
    console.log(`  ${table.padEnd(18)} ${fmt(Number(count))}`);
  }
  console.log(
    `\nXong: ${fmt(totals.days)} ngày mới, ${fmt(totals.skipped)} ngày bỏ qua, ` +
      `${formatDuration((Date.now() - startedAt) / 1000)}.`,
  );
}

try {
  main();
} catch (error) {
  console.error(
    `Sinh dữ liệu BENCH thất bại: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
