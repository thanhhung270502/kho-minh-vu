"use client";

import { FilterOutlined } from "@ant-design/icons";
import { Button, Drawer } from "antd";
import { useState, type ReactNode } from "react";

type Props = {
  filterPanel: ReactNode;
  toolbar: ReactNode;
  activeFilterCount: number;
  /** `<DetailPanel>` của dòng đang chọn (`?chon=`), null khi chưa chọn. */
  detailPanel?: ReactNode;
  children: ReactNode;
};

/**
 * Bố cục page danh sách kiểu KiotViet: panel lọc cố định trái (>=992px),
 * bảng ở giữa trong card trắng, panel chi tiết bên phải khi có dòng đang chọn.
 * Dưới 992px panel lọc sập vào ngăn kéo đáy.
 */
export function ListLayout({
  filterPanel,
  toolbar,
  activeFilterCount,
  detailPanel,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="flex items-start gap-4">
        {/* Panel lọc cố định trái, 264px, chỉ từ 992px */}
        <aside className="hidden w-[264px] shrink-0 rounded-the border border-vien bg-nen-the p-[18px] shadow-the lg:block">
          {filterPanel}
        </aside>

        <section className="min-w-0 flex-1 rounded-the border border-vien bg-nen-the p-3 shadow-the lg:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button
              className="lg:hidden"
              icon={<FilterOutlined />}
              onClick={() => setDrawerOpen(true)}
            >
              Bộ lọc{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Button>
            <div className="min-w-0 flex-1">{toolbar}</div>
          </div>

          {/*
            Bảng tự cuộn ngang bằng `scroll={{ x }}` của antd nên page không
            tràn ngang. KHÔNG bọc `overflow-x-auto` ở đây: nó biến khung này
            thành vùng cuộn riêng, tiêu đề bảng dính (`sticky.offsetHeader`)
            tính top theo khung thay vì theo cửa sổ và rơi vào giữa các dòng.
          */}
          <div className="min-w-0">{children}</div>
        </section>

        {detailPanel}
      </div>

      <Drawer
        title="Bộ lọc"
        placement="bottom"
        size="large"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      >
        {filterPanel}
      </Drawer>
    </>
  );
}
