"use client";

import { FilterOutlined } from "@ant-design/icons";
import { Button, Drawer } from "antd";
import { useState, type ReactNode } from "react";

type Props = {
  panelLoc: ReactNode;
  thanhCongCu: ReactNode;
  soDieuKien: number;
  children: ReactNode;
};

/**
 * Bố cục trang danh sách kiểu KiotViet: panel lọc cố định trái (>=992px),
 * bảng bên phải trong card trắng. Dưới 992px panel sập vào ngăn kéo đáy.
 */
export function BoCucDanhSach({ panelLoc, thanhCongCu, soDieuKien, children }: Props) {
  const [mo, setMo] = useState(false);

  return (
    <>
      <div className="flex items-start gap-4">
        {/* Panel lọc cố định trái, 264px, chỉ từ 992px */}
        <aside className="hidden w-[264px] shrink-0 rounded-the bg-nen-the p-4 shadow-the lg:block">
          {panelLoc}
        </aside>

        <section className="min-w-0 flex-1 rounded-the bg-nen-the p-3 shadow-the lg:p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <Button className="lg:hidden" icon={<FilterOutlined />} onClick={() => setMo(true)}>
              Bộ lọc{soDieuKien > 0 ? ` (${soDieuKien})` : ""}
            </Button>
            <div className="min-w-0 flex-1">{thanhCongCu}</div>
          </div>

          {/* Bảng cuộn ngang TRONG khung này, không để cả trang tràn ngang. */}
          <div className="overflow-x-auto">{children}</div>
        </section>
      </div>

      <Drawer title="Bộ lọc" placement="bottom" size="large" open={mo} onClose={() => setMo(false)}>
        {panelLoc}
      </Drawer>
    </>
  );
}
