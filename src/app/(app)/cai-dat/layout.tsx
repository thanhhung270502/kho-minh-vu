import type { ReactNode } from "react";

import { requirePermission } from "@/features/auth/api/current-user.server";
import { SettingsTabs } from "@/features/settings/components/settings-tabs";
import { SETTINGS_ANY_PERMISSION } from "@/features/settings/lib/settings-tabs";
import { PageHeader } from "@/shared/components/page-header";

export default async function SettingsLayout({ children }: { children: ReactNode }) {
  // Vào được nếu có ít nhất một tab; từng page con còn tự gác quyền của nó.
  const nd = await requirePermission(SETTINGS_ANY_PERMISSION);

  return (
    <>
      <PageHeader
        title="Cài đặt"
        description="Người dùng & chức vụ, kho, nhân viên phụ trách, quy tắc đánh số chứng từ."
      />

      <SettingsTabs user={{ role: nd.role, permissions: nd.permissions }} />

      {children}
    </>
  );
}
