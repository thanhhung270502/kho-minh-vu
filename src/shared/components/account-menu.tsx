"use client";

import { DownOutlined, LockOutlined, LogoutOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, Dropdown, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { ROLE_LABELS, type Role } from "@/shared/lib/permissions";

type AccountMenuProps = {
  user: { fullName: string; role: Role };
};

/** Header mọi trang nội bộ phải hiện họ tên + vai trò và nút Đăng xuất (D-34). */
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
        className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1 hover:bg-gray-100"
      >
        <Avatar size="small">{user.fullName.charAt(0).toUpperCase()}</Avatar>
        <span className="hidden items-center gap-2 sm:flex">
          <Typography.Text>{user.fullName}</Typography.Text>
          <Tag>{ROLE_LABELS[user.role]}</Tag>
        </span>
        <DownOutlined className="text-xs" />
      </button>
    </Dropdown>
  );
}
