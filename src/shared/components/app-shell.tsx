"use client";

import { Layout } from "antd";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { locTheoQuyen, tachMucMobile, timMucDangMo, MUC_DIEU_HUONG } from "@/shared/lib/dieu-huong";
import type { VaiTro } from "@/shared/lib/quyen";

import { ThanhTabDay } from "./thanh-tab-day";
import { TopNav } from "./top-nav";

const { Content } = Layout;

type AppShellProps = {
  nguoiDung: { hoTen: string; vaiTro: VaiTro };
  children: ReactNode;
};

export function AppShell({ nguoiDung, children }: AppShellProps) {
  const pathname = usePathname();
  // D-07: menu chỉ hiện mục vai trò có quyền — ẩn hẳn, không chỉ disable.
  const muc = locTheoQuyen(nguoiDung.vaiTro, MUC_DIEU_HUONG);
  const dangMo = timMucDangMo(pathname, muc);
  const { chinh, khac } = tachMucMobile(muc);

  return (
    <Layout className="min-h-screen">
      <TopNav nguoiDung={nguoiDung} muc={muc} dangMo={dangMo} />
      {/* pb-24 chừa chỗ cho thanh tab đáy — thiếu là hàng cuối bảng bị che. */}
      <Content className="px-4 pt-4 pb-24 lg:px-6 lg:pt-6 lg:pb-6">{children}</Content>
      <ThanhTabDay chinh={chinh} khac={khac} dangMo={dangMo} />
    </Layout>
  );
}
