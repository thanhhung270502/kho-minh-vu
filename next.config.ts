import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Màn đã gỡ khỏi giao diện (Phase 10) — link/bookmark cũ chuyển sang màn thay thế
  // thay vì 404. 307 (permanent: false) để trình duyệt không nhớ cứng khi đổi ý.
  async redirects() {
    return [
      { source: "/lich-su-kiotviet", destination: "/danh-muc", permanent: false },
    ];
  },
};

export default nextConfig;
