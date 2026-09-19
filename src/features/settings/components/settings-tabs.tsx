"use client";

import { Tabs } from "antd";
import { usePathname, useRouter } from "next/navigation";

import { tabsForRole } from "../lib/settings-tabs";
import type { Role } from "@/shared/lib/permissions";

export function SettingsTabs({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();

  const muc = tabsForRole(role);
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
