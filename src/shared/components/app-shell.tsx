"use client";

import {
  AppstoreOutlined,
  BarChartOutlined,
  DashboardOutlined,
  DeploymentUnitOutlined,
  InboxOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
} from "@ant-design/icons";
import { Button, Layout, Menu, Typography } from "antd";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

const { Sider, Header, Content } = Layout;

type MucMenu = {
  duongDan: string;
  nhan: string;
  icon: ReactNode;
};

const MUC_MENU: MucMenu[] = [
  { duongDan: "/", nhan: "Tổng quan", icon: <DashboardOutlined /> },
  {
    duongDan: "/san-xuat",
    nhan: "Lệnh sản xuất",
    icon: <DeploymentUnitOutlined />,
  },
  { duongDan: "/kho", nhan: "Tồn kho", icon: <InboxOutlined /> },
  { duongDan: "/bao-cao", nhan: "Báo cáo", icon: <BarChartOutlined /> },
  { duongDan: "/danh-muc", nhan: "Danh mục", icon: <AppstoreOutlined /> },
];

/** "/" chỉ khớp chính nó; các mục khác khớp cả route con. */
function timMucDangMo(pathname: string): string {
  const khop = MUC_MENU.filter(
    (muc) => muc.duongDan !== "/" && pathname.startsWith(muc.duongDan),
  );

  return khop.at(-1)?.duongDan ?? "/";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [thuGon, setThuGon] = useState(false);

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
        // Dưới 992px (máy tính bảng/điện thoại ở xưởng) menu tự thu về 0
        // để nhường hết màn hình cho bảng số liệu.
        breakpoint="lg"
        collapsedWidth={0}
        className="border-r border-gray-200"
      >
        <div className="flex h-14 items-center px-4">
          <Typography.Text strong className="truncate">
            Theo dõi sản xuất
          </Typography.Text>
        </div>

        <Menu
          mode="inline"
          selectedKeys={[timMucDangMo(pathname)]}
          items={MUC_MENU.map((muc) => ({
            key: muc.duongDan,
            icon: muc.icon,
            label: <Link href={muc.duongDan}>{muc.nhan}</Link>,
          }))}
        />
      </Sider>

      <Layout>
        <Header className="flex items-center gap-3 border-b border-gray-200 px-4">
          <Button
            type="text"
            aria-label={thuGon ? "Mở menu" : "Thu gọn menu"}
            icon={thuGon ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setThuGon((truoc) => !truoc)}
          />

          <Typography.Text type="secondary" className="truncate">
            Ép nhựa · Sơn · Carbon · Xi mạ · Đóng gói
          </Typography.Text>
        </Header>

        <Content className="p-4 lg:p-6">{children}</Content>
      </Layout>
    </Layout>
  );
}
