import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/types/database.types";

import { ensureBenchAccounts } from "./accounts";
import { buildCases, type BenchCase } from "./cases";
import { BENCH_DIR, readLocalSupabase } from "./local-env";
import { vnToday } from "./seed-args";
import {
  renderRunMarkdown,
  summarize,
  type BenchCaseResult,
  type BenchRole,
  type BenchRun,
  type CaseStatus,
} from "./stats";

type Client = SupabaseClient<Database>;

type RunArgs = {
  label: string;
  iterations: number;
  only: string[] | null;
  force: boolean;
  fastFail: boolean;
};

const LABEL_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const SCALE_TABLES = [
  "kho_movement",
  "chung_tu",
  "chung_tu_dong",
  "don_dat_hang",
  "don_dat_hang_dong",
  "nhat_ky_sua",
] as const;

function parseArgs(argv: string[]): RunArgs {
  const args: RunArgs = {
    label: "",
    iterations: 5,
    only: null,
    force: false,
    fastFail: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--label") args.label = argv[++i] ?? "";
    else if (arg === "--iterations") args.iterations = Number(argv[++i]);
    else if (arg === "--only") args.only = (argv[++i] ?? "").split(",").filter(Boolean);
    else if (arg === "--force") args.force = true;
    else if (arg === "--fast-fail") args.fastFail = true;
  }
  if (!LABEL_PATTERN.test(args.label)) {
    throw new Error(
      "Cách dùng: npm run bench:run -- --label <nhãn> [--iterations 5] [--only id1,id2] [--force] [--fast-fail]\n" +
        "Nhãn chỉ gồm a-z, 0-9 và dấu gạch ngang.",
    );
  }
  if (!Number.isInteger(args.iterations) || args.iterations < 1) {
    throw new Error("--iterations phải là số nguyên ≥ 1");
  }
  return args;
}

type CaseError = { code?: string; message: string };

// Lỗi PostgREST là object thường chứ không phải instance Error (bẫy 8) — đọc `.code`, không instanceof.
function toCaseError(e: unknown): CaseError {
  if (typeof e === "object" && e !== null) {
    const { code, message } = e as { code?: unknown; message?: unknown };
    return {
      code: typeof code === "string" ? code : undefined,
      message: typeof message === "string" ? message : String(e),
    };
  }
  return { message: String(e) };
}

function classify(error: CaseError): Exclude<CaseStatus, "ok" | "skipped"> {
  if (error.code === "57014") return "timeout";
  if (error.code === "42501") return "forbidden";
  return "error";
}

async function timed(
  fn: () => Promise<number>,
): Promise<{ ms: number; rows: number | null; error: CaseError | null }> {
  const start = performance.now();
  try {
    const rows = await fn();
    return { ms: performance.now() - start, rows, error: null };
  } catch (e) {
    return { ms: performance.now() - start, rows: null, error: toCaseError(e) };
  }
}

async function measure(
  benchCase: BenchCase,
  role: BenchRole,
  client: Client,
  args: RunArgs,
): Promise<BenchCaseResult> {
  const base = {
    id: benchCase.id,
    rpc: benchCase.rpc,
    role,
    params: benchCase.params,
  };
  const finish = (
    status: CaseStatus,
    samplesMs: number[],
    rows: number | null,
    error?: CaseError,
  ): BenchCaseResult => ({
    ...base,
    status,
    samplesMs,
    rows,
    ...(error ? { error } : {}),
    summary: summarize(samplesMs),
  });

  if (benchCase.skipReason) {
    return finish("skipped", [], null, { message: benchCase.skipReason });
  }

  try {
    await benchCase.setup?.(client, args.iterations);
  } catch (e) {
    return finish("error", [], null, toCaseError(e));
  }

  try {
    const warmup = await timed(() => benchCase.run(client));
    if (warmup.error && args.fastFail) {
      return finish(classify(warmup.error), [warmup.ms], null, warmup.error);
    }

    const samples: number[] = [];
    let rows: number | null = null;
    let firstError: CaseError | null = null;
    for (let i = 0; i < args.iterations; i++) {
      const sample = await timed(() => benchCase.run(client));
      if (sample.error) {
        firstError ??= sample.error;
        // Lỗi nhanh (không quyền, sai tham số) không phải số đo; timeout thì 8 giây chính là số đo.
        if (classify(sample.error) === "timeout") samples.push(sample.ms);
      } else {
        samples.push(sample.ms);
        rows = sample.rows;
      }
    }
    if (firstError) return finish(classify(firstError), samples, rows, firstError);
    return finish("ok", samples, rows);
  } finally {
    try {
      await benchCase.teardown?.(client);
    } catch (e) {
      process.stderr.write(`  teardown ${benchCase.id}: ${toCaseError(e).message}\n`);
    }
  }
}

async function countScale(admin: Client): Promise<Record<string, number>> {
  const scale: Record<string, number> = {};
  for (const table of SCALE_TABLES) {
    // Chỉ liệt kê cột + head: không bao giờ select("*") (bẫy 5).
    const { count, error } = await admin
      .from(table)
      .select("id", { count: "exact", head: true });
    if (error) throw error;
    scale[table] = count ?? 0;
  }
  return scale;
}

function latestMigration(): string {
  const files = readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort();
  return files[files.length - 1] ?? "";
}

function gitSha(): string {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

async function signIn(
  apiUrl: string,
  anonKey: string,
  email: string,
  password: string,
): Promise<Client> {
  const client = createClient<Database>(apiUrl, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Không đăng nhập được ${email}: ${error.message}`);
  return client;
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  // Guard D-01 chạy trước mọi client.
  const env = readLocalSupabase();

  const jsonPath = `${BENCH_DIR}/${args.label}.json`;
  if (existsSync(jsonPath) && !args.force) {
    throw new Error(`${jsonPath} đã có — đặt nhãn khác hoặc thêm --force để ghi đè.`);
  }

  const admin = createClient<Database>(env.apiUrl, env.serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const accounts = await ensureBenchAccounts(admin);
  const clients: Record<BenchRole, Client> = {
    quan_ly: await signIn(env.apiUrl, env.anonKey, accounts.quan_ly.email, accounts.quan_ly.password),
    thu_kho: await signIn(env.apiUrl, env.anonKey, accounts.thu_kho.email, accounts.thu_kho.password),
  };

  const scale = await countScale(admin);
  const { cases, missing } = await buildCases(admin, vnToday());
  if (missing.length > 0) {
    process.stderr.write(`Thiếu fixture BENCH (ca liên quan sẽ skipped): ${missing.join(", ")}\n`);
  }

  const selected = args.only ? cases.filter((c) => args.only?.includes(c.id)) : cases;
  const results: BenchCaseResult[] = [];
  for (const benchCase of selected) {
    for (const role of benchCase.roles) {
      const result = await measure(benchCase, role, clients[role], args);
      results.push(result);
      const detail = result.error?.code ? ` ${result.error.code}` : "";
      process.stderr.write(
        `  ${result.id} [${role}] ${result.status}${detail} p50=${result.summary.p50 ?? "—"}ms\n`,
      );
    }
  }

  const run: BenchRun = {
    label: args.label,
    createdAt: new Date().toISOString(),
    gitSha: gitSha(),
    latestMigration: latestMigration(),
    iterations: args.iterations,
    scale,
    cases: results,
  };
  const markdown = renderRunMarkdown(run);
  mkdirSync(BENCH_DIR, { recursive: true });
  writeFileSync(jsonPath, `${JSON.stringify(run, null, 2)}\n`);
  writeFileSync(`${BENCH_DIR}/${args.label}.md`, markdown);
  process.stdout.write(markdown);
  process.stdout.write(`\nĐã lưu ${jsonPath} và ${BENCH_DIR}/${args.label}.md\n`);
}

main().catch((e: unknown) => {
  process.stderr.write(`${e instanceof Error ? e.message : String(e)}\n`);
  process.exit(1);
});
