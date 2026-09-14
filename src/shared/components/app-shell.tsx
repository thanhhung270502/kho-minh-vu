"use client";

import {
  AppstoreOutlined,
  DashboardOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  SettingOutlined,
  TeamOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { MenuTaiKhoan } from "@/shared/components/menu-tai-khoan";
import { coQuyen, type Quyen, type VaiTro } from "@/shared/lib/quyen";

const { Sider, Header, Content } = Layout;

type MucMenu = {
  duongDan: string;
  nhan: string;
  icon: ReactNode;
  quyen: Quyen;
};

const MUC_MENU: MucMenu[] = [
  {
    duongDan: "/",
    nhan: "Tổng quan",
    icon: <DashboardOutlined />,
    quyen: "xem_danh_muc",
  },
  {
    duongDan: "/danh-muc",
    nhan: "Danh mục hàng",
    icon: <AppstoreOutlined />,
    quyen: "xem_danh_muc",
  },
  {
    duongDan: "/doi-tac",
    nhan: "Đối tác",
    icon: <TeamOutlined />,
    quyen: "xem_danh_muc",
  },
  {
    duongDan: "/cai-dat",
    nhan: "Cài đặt",
    icon: <SettingOutlined />,
    quyen: "cai_dat_danh_muc_phu",
  },
];

/** "/" chỉ khớp chính nó; các mục khác khớp cả route con. */
function timMucDangMo(pathname: string, muc: MucMenu[]): string {
  const khop = muc.filter(
    (m) => m.duongDan !== "/" && pathname.startsWith(m.duongDan),
  );

  return khop.at(-1)?.duongDan ?? "/";
}

type AppShellProps = {
  nguoiDung: { hoTen: string; vaiTro: VaiTro };
  children: ReactNode;
};

export function AppShell({ nguoiDung, children }: AppShellProps) {
  const pathname = usePathname();
  const [thuGon, setThuGon] = useState(false);

  // D-07: menu chỉ hiện mục vai trò có quyền — ẩn hẳn, không chỉ disable.
  const mucDuocPhep = MUC_MENU.filter((muc) =>
    coQuyen(nguoiDung.vaiTro, muc.quyen),
  );

  return (
    <Layout className="min-h-screen">
      <Sider
        collapsible
        collapsed={thuGon}
        onCollapse={setThuGon}
        // Nút thu gọn mặc định của antd nằm đè lên vùng nội dung khi
        // collapsedWidth=0. Tự đặt nút trong Header thay thế.
        trigger={null}
        theme="light"
        // Dưới 992px (điện thoại thủ kho) menu tự thu về 0 để nhường hết
        // màn hình cho bảng số liệu.
        breakpoint="lg"
        collapsedWidth={0}
        className="border-r border-gray-200"
      >
        <div className="flex h-14 items-center px-4">
          <Typography.Text strong className="truncate">
            Kho Minh Vũ
          </Typography.Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[timMucDangMo(pathname, mucDuocPhep)]}
          items={mucDuocPhep.map((muc) => ({
            key: muc.duongDan,
            icon: muc.icon,
            label: <Link href={muc.duongDan}>{muc.nhan}</Link>,
          }))}
        />
      </Sider>

      <Layout>
        <Header className="flex items-center justify-between gap-3 border-b border-gray-200 px-4">
          <Button
            type="text"
            aria-label={thuGon ? "Mở menu" : "Thu gọn menu"}
            icon={thuGon ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setThuGon((truoc) => !truoc)}
          />

          <MenuTaiKhoan nguoiDung={nguoiDung} />
        </Header>

        <Content className="p-4 lg:p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
