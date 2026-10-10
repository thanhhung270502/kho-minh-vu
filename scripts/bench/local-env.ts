import { execFileSync, spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

import { assertLocalSupabaseUrl } from "../../tests/integration/support/local-guard";

// Cấu hình chỉ lấy từ `supabase status`. Tuyệt đối không đọc file env của app:
// file đó đổi qua lại local <-> cloud, bench mà lỡ trỏ cloud là ghi rác vào sổ thật.

export const BENCH_DIR = ".planning/phases/22-toi-uu-du-lieu-lon/bench";

export type LocalSupabase = {
  apiUrl: string;
  anonKey: string;
  serviceKey: string;
  dbUrl: string;
};

const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);
const DB_PROTOCOLS = new Set(["postgres:", "postgresql:"]);

export function parseStatusEnv(output: string): Map<string, string> {
  const values = new Map<string, string>();
  for (const line of output.split("\n")) {
    const match = /^([A-Z0-9_]+)="?(.*?)"?$/.exec(line.trim());
    if (match?.[1]) values.set(match[1], match[2] ?? "");
  }
  return values;
}

/** So khớp hostname CHÍNH XÁC: `includes("127.0.0.1")` sẽ lọt `127.0.0.1.evil.com`. */
export function assertLocalDbUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `Script bench chỉ chạy trên Supabase LOCAL (127.0.0.1 hoặc localhost). Không đọc được URL: ${JSON.stringify(raw)}.`,
    );
  }
  if (!DB_PROTOCOLS.has(url.protocol) || !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Script bench chỉ chạy trên Supabase LOCAL (127.0.0.1 hoặc localhost), nhận: ${url.hostname}. ` +
        "Không bao giờ trỏ vào project cloud.",
    );
  }
  return url;
}

export function readLocalSupabase(): LocalSupabase {
  let output: string;
  try {
    output = execFileSync("npx", ["supabase", "status", "-o", "env"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch {
    throw new Error(
      "Không đọc được `supabase status` — chạy `npm run db:start` trước.",
    );
  }

  const values = parseStatusEnv(output);
  const apiUrl = values.get("API_URL");
  const dbUrl = values.get("DB_URL");
  const anonKey = values.get("ANON_KEY") ?? values.get("PUBLISHABLE_KEY");
  const serviceKey = values.get("SERVICE_ROLE_KEY") ?? values.get("SECRET_KEY");
  if (!apiUrl || !dbUrl || !anonKey || !serviceKey) {
    throw new Error(
      "Không đọc được `supabase status` — chạy `npm run db:start` trước.",
    );
  }

  assertLocalSupabaseUrl(apiUrl);
  assertLocalDbUrl(dbUrl);
  return { apiUrl, anonKey, serviceKey, dbUrl };
}

export function findPsql(): string {
  if (process.env.PSQL) return process.env.PSQL;
  const brew = "/opt/homebrew/opt/postgresql@15/bin/psql";
  return existsSync(brew) ? brew : "psql";
}

export type RunPsqlOptions = {
  file?: string;
  sql?: string;
  vars?: Record<string, string>;
  args?: string[];
  capture?: boolean;
};

export function runPsql(dbUrl: string, opts: RunPsqlOptions): string {
  assertLocalDbUrl(dbUrl);
  if (!opts.file && !opts.sql) {
    throw new Error("runPsql cần `file` hoặc `sql`.");
  }

  // Phiên psql phải dùng TimeZone mặc định của server (UTC, cùng PostgREST): các hàm
  // `_ghi_so_*` ép `ngay_ct::timestamptz` theo TimeZone phiên nên PGTZ lạ sẽ lệch ngày.
  const env = { ...process.env };
  delete env.PGTZ;
  delete env.PGOPTIONS;

  const varArgs = Object.entries(opts.vars ?? {}).flatMap(([k, v]) => [
    "-v",
    `${k}=${v}`,
  ]);
  const target = opts.file ? ["-f", opts.file] : ["-c", opts.sql ?? ""];
  const result = spawnSync(
    findPsql(),
    [
      dbUrl,
      "-X",
      "-q",
      "-v",
      "ON_ERROR_STOP=1",
      ...varArgs,
      ...(opts.args ?? []),
      ...target,
    ],
    {
      encoding: "utf8",
      stdio: opts.capture ? ["ignore", "pipe", "inherit"] : "inherit",
      env,
      maxBuffer: 256 * 1024 * 1024,
    },
  );

  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(
      `psql thoát với mã ${String(result.status)} khi chạy ${opts.file ?? "câu lệnh SQL"}.`,
    );
  }
  return opts.capture ? (result.stdout ?? "") : "";
}
