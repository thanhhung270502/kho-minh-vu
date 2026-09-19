"use client";

import { EllipsisOutlined } from "@ant-design/icons";
import { Drawer } from "antd";
import Link from "next/link";
import { useState } from "react";

import { soCotTabDay, type MucDieuHuong } from "@/shared/lib/dieu-huong";

import { ICON_DIEU_HUONG } from "./icon-dieu-huong";

type ThanhTabDayProps = {
  chinh: MucDieuHuong[];
  khac: MucDieuHuong[];
  dangMo: string;
};

/**
 * Thanh tab cố định đáy cho màn hình dưới 992px — người dùng đã loại phương
 * án drawer hamburger (thủ kho cầm điện thoại một tay).
 */
export function ThanhTabDay({ chinh, khac, dangMo }: ThanhTabDayProps) {
  const [moKhac, setMoKhac] = useState(false);
  const soCot = soCotTabDay(chinh, khac);
  const dangMoOKhac = khac.some((m) => m.duongDan === dangMo);

  return (
    <>
      <nav
        data-khong-in
        className="fixed inset-x-0 bottom-0 z-30 border-t border-vien bg-nen-the lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${soCot}, minmax(0,1fr))` }}
        >
          {chinh.map((m) => (
            <Link
              key={m.duongDan}
              href={m.duongDan}
              className={[
                "flex flex-col items-center gap-0.5 py-2 text-center",
                m.duongDan === dangMo ? "font-medium text-brand-600" : "text-chu-phu",
              ].join(" ")}
            >
              <span className="text-xl leading-none">{ICON_DIEU_HUONG[m.icon]}</span>
              <span className="text-[11px] leading-none">{m.nhanNgan}</span>
            </Link>
          ))}

          {khac.length > 0 ? (
            <button
              type="button"
              onClick={() => setMoKhac(true)}
              className={[
                "flex flex-col items-center gap-0.5 py-2 text-center",
                dangMoOKhac ? "font-medium text-brand-600" : "text-chu-phu",
              ].join(" ")}
            >
              <span className="text-xl leading-none">
                <EllipsisOutlined />
              </span>
              <span className="text-[11px] leading-none">Khác</span>
            </button>
          ) : null}
        </div>
      </nav>

      {khac.length > 0 ? (
        <Drawer
          title="Khác"
          placement="bottom"
          size="default"
          open={moKhac}
          onClose={() => setMoKhac(false)}
        >
          <div className="flex flex-col gap-1">
            {khac.map((m) => (
              <Link
                key={m.duongDan}
                href={m.duongDan}
                onClick={() => setMoKhac(false)}
                className={[
                  "flex items-center gap-3 rounded-the px-3 py-2.5 text-base",
                  m.duongDan === dangMo ? "font-medium text-brand-600" : "text-chu-chinh",
                ].join(" ")}
              >
                {ICON_DIEU_HUONG[m.icon]}
                {m.nhan}
              </Link>
            ))}
          </div>
        </Drawer>
      ) : null}
    </>
  );
}
