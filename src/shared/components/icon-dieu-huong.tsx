"use client";

import {
  AppstoreOutlined,
  DashboardOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import type { ReactNode } from "react";

import type { MaIcon } from "@/shared/lib/dieu-huong";

/** Ánh xạ mã icon (file thuần) sang element antd (file client) — xem bẫy 9. */
export const ICON_DIEU_HUONG: Record<MaIcon, ReactNode> = {
  "tong-quan": <DashboardOutlined />,
  "danh-muc": <AppstoreOutlined />,
  "doi-tac": <TeamOutlined />,
  "cai-dat": <SettingOutlined />,
};
