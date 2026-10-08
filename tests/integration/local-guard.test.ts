import { describe, expect, it } from "vitest";

import { assertLocalSupabaseUrl } from "./support/local-guard";

describe("assertLocalSupabaseUrl", () => {
  it.each(["http://127.0.0.1:54321", "http://localhost:54321"])(
    "chấp nhận %s",
    (url) => {
      expect(() => assertLocalSupabaseUrl(url)).not.toThrow();
    },
  );

  it.each([
    "https://abc.supabase.co",
    "http://127.0.0.1.evil.com",
    "http://localhost.evil.com:54321",
    "https://evil.com/127.0.0.1",
    "",
    "không-phải-url",
  ])("từ chối %j", (url) => {
    expect(() => assertLocalSupabaseUrl(url)).toThrow(/LOCAL/);
  });
});
