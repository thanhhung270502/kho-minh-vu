"use client";

import { Alert } from "antd";

/** antd chỉ chạy trong Client Component (bẫy #1 CLAUDE.md). */
export function ThongBaoMatKhauTam() {
  return (
    <Alert
      className="mb-4"
      type="info"
      showIcon
      title="Bạn đang dùng mật khẩu tạm"
      description="Quản lý vừa cấp hoặc đặt lại mật khẩu cho tài khoản này. Đặt mật khẩu riêng để tiếp tục dùng hệ thống."
    />
  );
}
