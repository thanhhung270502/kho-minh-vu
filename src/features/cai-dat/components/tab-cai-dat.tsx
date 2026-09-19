"use client";

import { Tabs } from "antd";
import { usePathname, useRouter } from "next/navigation";

import { tabCuaVaiTro } from "../lib/tab-cai-dat";
import type { Role } from "@/shared/lib/permissions";

export function TabCaiDat({ role }: { role: Role }) {
  const router = useRouter();
  const pathname = usePathname();

  const muc = tabCuaVaiTro(role);
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
