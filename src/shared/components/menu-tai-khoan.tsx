"use client";

import { DownOutlined, LockOutlined, LogoutOutlined } from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { Avatar, Dropdown, Tag, Typography } from "antd";
import { useRouter } from "next/navigation";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import { NHAN_VAI_TRO, type VaiTro } from "@/shared/lib/quyen";

type MenuTaiKhoanProps = {
  nguoiDung: { hoTen: string; vaiTro: VaiTro };
};

/** Header mọi trang nội bộ phải hiện họ tên + vai trò và nút Đăng xuất (D-34). */
export function MenuTaiKhoan({ nguoiDung }: MenuTaiKhoanProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  const dangXuat = async () => {
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
            key: "doi-mat-khau",
            icon: <LockOutlined />,
            label: "Đổi mật khẩu",
            onClick: () => router.push("/doi-mat-khau"),
          },
          { type: "divider" },
          {
            key: "dang-xuat",
            icon: <LogoutOutlined />,
            label: "Đăng xuất",
            danger: true,
            onClick: dangXuat,
          },
        ],
      }}
    >
      <button
        type="button"
        className="flex cursor-pointer items-center gap-2 rounded-md border-0 bg-transparent px-2 py-1 hover:bg-gray-100"
      >
        <Avatar size="small">{nguoiDung.hoTen.charAt(0).toUpperCase()}</Avatar>
        <span className="hidden items-center gap-2 sm:flex">
          <Typography.Text>{nguoiDung.hoTen}</Typography.Text>
          <Tag>{NHAN_VAI_TRO[nguoiDung.vaiTro]}</Tag>
        </span>
        <DownOutlined className="text-xs" />
      </button>
    </Dropdown>
  );
}
