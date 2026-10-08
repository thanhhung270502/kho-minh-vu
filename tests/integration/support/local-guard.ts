const LOCAL_HOSTS = new Set(["127.0.0.1", "localhost"]);

/**
 * `.env.local` của repo đang trỏ project cloud thật — integration test không bao giờ
 * được chạm vào đó. So khớp hostname CHÍNH XÁC: `includes("127.0.0.1")` sẽ lọt
 * `127.0.0.1.evil.com`.
 */
export function assertLocalSupabaseUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error(
      `Integration test chỉ chạy trên Supabase LOCAL (127.0.0.1 hoặc localhost). Không đọc được URL: ${JSON.stringify(raw)}.`,
    );
  }

  const isHttp = url.protocol === "http:" || url.protocol === "https:";
  if (!isHttp || !LOCAL_HOSTS.has(url.hostname)) {
    throw new Error(
      `Integration test chỉ chạy trên Supabase LOCAL (127.0.0.1 hoặc localhost), nhận: ${url.hostname}. ` +
        "Không bao giờ trỏ vào project cloud.",
    );
  }
  return url;
}
