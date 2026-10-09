import { inject, vi } from "vitest";

// Mock thay vì refactor production: các hàm api/*.api.ts gọi thẳng getSupabaseBrowserClient().
// Nhờ mock này @/lib/env (đọc NEXT_PUBLIC_*) không bao giờ được nạp trong integration.
vi.mock("@/lib/supabase/client", async () => {
  const session = await import("./session");
  return { getSupabaseBrowserClient: () => session.currentClient() };
});

vi.mock("@/lib/env", () => {
  const { url, anonKey } = inject("supabase");
  return { env: { SUPABASE_URL: url, SUPABASE_PUBLISHABLE_KEY: anonKey } };
});
