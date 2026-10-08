import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { inject } from "vitest";

import type { Database } from "@/types/database.types";

import type { TestRole } from "./global-setup";
import { assertLocalSupabaseUrl } from "./local-guard";

type TestClient = SupabaseClient<Database>;

const cache = new Map<TestRole, TestClient>();
let current: TestClient | null = null;

export async function signInAs(role: TestRole): Promise<TestClient> {
  const cached = cache.get(role);
  if (cached) return cached;

  const { url, anonKey } = inject("supabase");
  assertLocalSupabaseUrl(url);

  const client = createClient<Database>(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { email, password } = inject("accounts")[role];
  const { error } = await client.auth.signInWithPassword({ email, password });
  if (error) throw new Error(`Đăng nhập ${email} lỗi: ${error.message}`);

  cache.set(role, client);
  return client;
}

/** Từ đây các hàm api/*.api.ts (qua getSupabaseBrowserClient đã mock) chạy dưới danh nghĩa vai trò này. */
export async function useRole(role: TestRole): Promise<TestClient> {
  current = await signInAs(role);
  return current;
}

export function currentClient(): TestClient {
  if (!current)
    throw new Error("Chưa gọi useRole(...) trong beforeAll của file test.");
  return current;
}

export function k1WarehouseId(): string {
  return inject("accounts").k1Id;
}
