"use client";

import { FilterOutlined } from "@ant-design/icons";
import { Button, Drawer } from "antd";
import { useState, type ReactNode } from "react";

type Props = {
  filterPanel: ReactNode;
  toolbar: ReactNode;
  activeFilterCount: number;
  children: ReactNode;
};

/**
 * Bố cục trang danh sách kiểu KiotViet: panel lọc cố định trái (>=992px),
 * bảng bên phải trong card trắng. Dưới 992px panel sập vào ngăn kéo đáy.
 */
export function ListLayout({
  filterPanel,
  toolbar,
  activeFilterCount,
  children,
}: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      <div className="flex items-start gap-4">
        {/* Panel lọc cố định trái, 264px, chỉ từ 992px */}
        <aside className="hidden w-[264px] shrink-0 rounded-the bg-nen-the p-4 shadow-the lg:block">
          {filterPanel}
        </aside>

        <section className="min-w-0 flex-1 rounded-the bg-nen-the p-3 shadow-the lg:p-4">
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

          {/* Bảng cuộn ngang TRONG khung này, không để cả trang tràn ngang. */}
          <div className="overflow-x-auto">{children}</div>
        </section>
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
