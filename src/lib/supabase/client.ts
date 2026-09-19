import { createBrowserClient } from "@supabase/ssr";

import { env } from "@/lib/env";
import type { Database } from "@/types/database.types";

type SupabaseBrowserClient = ReturnType<typeof createBrowserClient<Database>>;

let client: SupabaseBrowserClient | undefined;

/**
 * Client dùng ở phía trình duyệt (Client Component, hook React Query).
 *
 * Dùng chung một instance cho cả tab: tạo nhiều instance sẽ sinh nhiều
 * listener onAuthStateChange và nhiều kết nối Realtime trùng nhau.
 */
export function getSupabaseBrowserClient(): SupabaseBrowserClient {
  client ??= createBrowserClient<Database>(
    env.SUPABASE_URL,
    env.SUPABASE_PUBLISHABLE_KEY,
  );

  return client;
}
