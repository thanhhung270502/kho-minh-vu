import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Màn đã gỡ khỏi giao diện (Phase 10) — link/bookmark cũ chuyển sang màn thay thế
  // thay vì 404. 307 (permanent: false) để trình duyệt không nhớ cứng khi đổi ý.
  async redirects() {
    return [
      { source: "/lich-su-kiotviet", destination: "/danh-muc", permanent: false },
      // "Xuất kho" đổi tên "Hóa đơn" — giữ nguyên id và trang in phía sau.
      { source: "/xuat-kho", destination: "/hoa-don", permanent: false },
      { source: "/xuat-kho/:path*", destination: "/hoa-don/:path*", permanent: false },
      // Trang Tồn kho gỡ (Phase 10) — tra tồn ở Danh sách hàng hóa; duyệt định
      // mức thành tab của trang Phân tích (Phase 13).
      { source: "/ton-kho", destination: "/danh-muc", permanent: false },
      { source: "/ton-kho/nap-tam", destination: "/danh-muc", permanent: false },
      { source: "/ton-kho/dinh-muc", destination: "/phan-tich?tab=dinh-muc", permanent: false },
      // Nhóm hàng / ĐVT / Công đoạn rời Cài đặt (Phase 11) — quản lý bằng nút
      // "Danh mục phụ" ở Danh sách hàng hóa.
      { source: "/cai-dat/nhom-hang", destination: "/danh-muc", permanent: false },
      { source: "/cai-dat/don-vi-tinh", destination: "/danh-muc", permanent: false },
      { source: "/cai-dat/cong-doan", destination: "/danh-muc", permanent: false },
    ];
  },
};

export default nextConfig;
