"use client";

import { Tabs } from "antd";
import { usePathname, useRouter } from "next/navigation";

import type { PermissionSubject } from "@/shared/lib/permissions";

import { tabsFor } from "../lib/settings-tabs";

export function SettingsTabs({ user }: { user: PermissionSubject }) {
  const router = useRouter();
  const pathname = usePathname();

  const muc = tabsFor(user);
  // Trang con (ví dụ /cai-dat/kho/abc) vẫn phải sáng đúng tab cha.
  const dangMo = muc.find((t) => pathname.startsWith(t.duongDan))?.duongDan;

  return (
    <Tabs
      className="mb-4"
      activeKey={dangMo}
      onChange={(k) => router.push(k)}
      items={muc.map((t) => ({ key: t.duongDan, label: t.label }))}
    />
  );
}
