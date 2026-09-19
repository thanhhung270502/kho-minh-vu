"use client";

import {
  AppstoreOutlined,
  DashboardOutlined,
  ImportOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

import type { NavIconId } from "@/shared/lib/navigation";

/** Ánh xạ mã icon (file thuần) sang element antd (file client) — xem bẫy 9. */
export const NAV_ICONS: Record<NavIconId, ReactNode> = {
  dashboard: <DashboardOutlined />,
  "stock-in": <ImportOutlined />,
  catalog: <AppstoreOutlined />,
  partners: <TeamOutlined />,
  settings: <SettingOutlined />,
};
