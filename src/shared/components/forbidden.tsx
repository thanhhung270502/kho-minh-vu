"use client";

import { Button, Result } from "antd";
import Link from "next/link";

export function Forbidden() {
  return (
    <Result
      status="403"
      title="Tài khoản không có quyền mở page này"
      subTitle="Trang này dành cho vai trò khác. Liên hệ quản lý nếu bạn cần quyền."
      extra={
        <Link href="/">
          <Button type="primary">Về page chính</Button>
        </Link>
      }
    />
  );
}
