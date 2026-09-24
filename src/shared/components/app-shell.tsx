"use client";

import { Layout } from "antd";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import {
  filterNavItems,
  findActiveHref,
  splitMobileItems,
  NAV_ITEMS,
} from "@/shared/lib/navigation";
import type { Role } from "@/shared/lib/permissions";

import { BottomTabBar } from "./bottom-tab-bar";
import { TopNav } from "./top-nav";

const { Content } = Layout;

type AppShellProps = {
  user: { fullName: string; role: Role; canViewKiotVietHistory: boolean };
  children: ReactNode;
};

export function AppShell({ user, children }: AppShellProps) {
  const pathname = usePathname();
  // D-07: menu chỉ hiện mục vai trò có quyền — ẩn hẳn, không chỉ disable.
  // D-13: "Lịch sử KiotViet" thêm ẩn theo công tắc theo người.
  const items = filterNavItems(user, NAV_ITEMS);
  const activeHref = findActiveHref(pathname, items);
  const { primary, overflow } = splitMobileItems(items);

  return (
    <Layout className="min-h-screen">
      <TopNav user={user} items={items} activeHref={activeHref} />
      {/* pb-24 chừa chỗ cho thanh tab đáy — thiếu là hàng cuối bảng bị che. */}
      <Content className="px-4 pt-4 pb-24 lg:px-6 lg:pt-6 lg:pb-6">{children}</Content>
      <BottomTabBar primary={primary} overflow={overflow} activeHref={activeHref} />
    </Layout>
  );
}
