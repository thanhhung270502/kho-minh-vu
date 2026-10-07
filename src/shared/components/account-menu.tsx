"use client";

import { LockOutlined, LogoutOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Dropdown } from "antd";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Role } from "@/shared/lib/permissions";

type AccountMenuProps = {
  user: { fullName: string; role: Role };
};

/** "Nguyễn Văn Tùng" → "NT": chữ đầu của họ và của tên. */
function initials(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  const first = words[0]?.charAt(0) ?? "";
  const last = words.length > 1 ? (words[words.length - 1]?.charAt(0) ?? "") : "";
  return (first + last).toUpperCase();
}

/** Header mọi page nội bộ phải hiện họ tên + vai trò và nút Đăng xuất (D-34). */
export function AccountMenu({ user }: AccountMenuProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const signOut = async () => {
    await getSupabaseBrowserClient().auth.signOut();
    queryClient.clear();
    router.replace("/dang-nhap");
    router.refresh();
  };

  return (
    <Dropdown
      trigger={["click"]}
      menu={{
        items: [
          {
            key: "who",
            label: (
              <span>
                {user.fullName} · {ROLE_LABELS[user.role]}
              </span>
            ),
            disabled: true,
          },
          { type: "divider" },
          {
            key: "change-password",
            icon: <LockOutlined />,
            label: "Đổi mật khẩu",
            onClick: () => router.push("/doi-mat-khau"),
          },
          { type: "divider" },
          {
            key: "sign-out",
            icon: <LogoutOutlined />,
            label: "Đăng xuất",
            danger: true,
            onClick: signOut,
          },
        ],
      }}
    >
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2.5 rounded-full border-0 bg-transparent py-1 ps-2 pe-1 text-left hover:bg-trung-tinh-75"
      >
        <span className="hidden text-[14px] font-semibold whitespace-nowrap text-chu-chinh sm:inline">
          {user.fullName}
        </span>
        <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-trung-tinh-150 text-[12.5px] font-bold text-chu-chinh">
          {initials(user.fullName)}
        </span>
      </button>
    </Dropdown>
  );
}
