import { describe, expect, it } from "vitest";

import { assertLocalDbUrl, parseStatusEnv } from "./local-env";

describe("parseStatusEnv", () => {
  it("đọc KEY=\"value\" và bỏ qua dòng rác của supabase status", () => {
    const output = [
      'API_URL="http://127.0.0.1:54321"',
      'DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"',
      "Stopped services: [x]",
      "A new version of Supabase CLI is available",
    ].join("\n");

    const values = parseStatusEnv(output);

    expect(values.get("API_URL")).toBe("http://127.0.0.1:54321");
    expect(values.get("DB_URL")).toBe(
      "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    );
    expect(values.size).toBe(2);
  });
});

describe("assertLocalDbUrl", () => {
  it.each([
    "postgresql://postgres:postgres@127.0.0.1:54322/postgres",
    "postgres://u@localhost:5432/x",
  ])("chấp nhận %s", (raw) => {
    expect(() => assertLocalDbUrl(raw)).not.toThrow();
  });

  it.each([
    "postgresql://postgres.rnpqgbuypmecxiatuulz:pw@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres",
    "postgresql://u@127.0.0.1.evil.com:5432/db",
    "http://127.0.0.1:54322/postgres",
    "khong phai url",
  ])("từ chối %s", (raw) => {
    expect(() => assertLocalDbUrl(raw)).toThrow(/LOCAL/);
  });
});
