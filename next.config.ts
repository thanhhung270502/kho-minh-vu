import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Màn đã gỡ khỏi giao diện (Phase 10) — link/bookmark cũ chuyển sang màn thay thế
  // thay vì 404. 307 (permanent: false) để trình duyệt không nhớ cứng khi đổi ý.
  async redirects() {
    return [
      { source: "/lich-su-kiotviet", destination: "/danh-muc", permanent: false },
      // Phase 17 (TEN-02): "Đặt hàng" → "Đơn đặt", "Hóa đơn" → "Duyệt đơn". Link cũ
      // giữ nguyên id, trang in và query (Next tự chuyển query sang đích).
      { source: "/dat-hang", destination: "/don-dat", permanent: false },
      { source: "/dat-hang/:path*", destination: "/don-dat/:path*", permanent: false },
      { source: "/hoa-don", destination: "/duyet-don", permanent: false },
      { source: "/hoa-don/:path*", destination: "/duyet-don/:path*", permanent: false },
      // "Xuất kho" (Phase 10) → thẳng Duyệt đơn; KHÔNG trỏ qua /hoa-don (tránh chuỗi 2 bước).
      { source: "/xuat-kho", destination: "/duyet-don", permanent: false },
      { source: "/xuat-kho/:path*", destination: "/duyet-don/:path*", permanent: false },
      // Trang Tồn kho gỡ (Phase 10) — tra tồn ở Danh sách hàng hóa; duyệt định
      // mức thành tab của trang Phân tích (Phase 13).
      { source: "/ton-kho", destination: "/danh-muc", permanent: false },
      { source: "/ton-kho/nap-tam", destination: "/danh-muc", permanent: false },
      { source: "/ton-kho/dinh-muc", destination: "/phan-tich?tab=dinh-muc", permanent: false },
      // Trang chi tiết đối tác thành panel trên danh sách (PANEL-03) — link cũ vẫn mở đúng đối tác.
      { source: "/doi-tac/:id([0-9a-fA-F-]{36})", destination: "/doi-tac?chon=:id", permanent: false },
      // Nhóm hàng / ĐVT / Công đoạn rời Cài đặt (Phase 11) — quản lý bằng nút
      // "Danh mục phụ" ở Danh sách hàng hóa.
      { source: "/cai-dat/nhom-hang", destination: "/danh-muc", permanent: false },
      { source: "/cai-dat/don-vi-tinh", destination: "/danh-muc", permanent: false },
      { source: "/cai-dat/cong-doan", destination: "/danh-muc", permanent: false },
    ];
  },
};

export default nextConfig;
