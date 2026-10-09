import { readLocalSupabase, runPsql } from "./local-env";

function main(): void {
  const env = readLocalSupabase();
  console.log(`Dọn dữ liệu BENCH trên ${new URL(env.dbUrl).host}`);
  runPsql(env.dbUrl, { file: "scripts/bench/clean.sql" });
}

try {
  main();
} catch (error) {
  console.error(
    `Dọn dữ liệu BENCH thất bại: ${error instanceof Error ? error.message : String(error)}`,
  );
  process.exitCode = 1;
}
