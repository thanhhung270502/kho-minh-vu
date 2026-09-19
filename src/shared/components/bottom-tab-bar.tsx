"use client";

import { EllipsisOutlined } from "@ant-design/icons";
import { Drawer } from "antd";
import Link from "next/link";
import { useState } from "react";

import { bottomTabColumns, type NavItem } from "@/shared/lib/navigation";

import { NAV_ICONS } from "./nav-icons";

type BottomTabBarProps = {
  primary: NavItem[];
  overflow: NavItem[];
  activeHref: string;
};

/**
 * Thanh tab cố định đáy cho màn hình dưới 992px — người dùng đã loại phương
 * án drawer hamburger (thủ kho cầm điện thoại một tay).
 */
export function BottomTabBar({ primary, overflow, activeHref }: BottomTabBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const columns = bottomTabColumns(primary, overflow);
  const activeIsInOverflow = overflow.some((item) => item.href === activeHref);

  return (
    <>
      <nav
        data-no-print
        className="fixed inset-x-0 bottom-0 z-30 border-t border-vien bg-nen-the lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div
          className="grid"
          style={{ gridTemplateColumns: `repeat(${columns}, minmax(0,1fr))` }}
        >
          {primary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "flex flex-col items-center gap-0.5 py-2 text-center",
                item.href === activeHref
                  ? "font-medium text-brand-600"
                  : "text-chu-phu",
              ].join(" ")}
            >
              <span className="text-xl leading-none">{NAV_ICONS[item.icon]}</span>
              <span className="text-[11px] leading-none">{item.shortLabel}</span>
            </Link>
          ))}

          {overflow.length > 0 ? (
            <button
              type="button"
              onClick={() => setOverflowOpen(true)}
              className={[
                "flex flex-col items-center gap-0.5 py-2 text-center",
                activeIsInOverflow ? "font-medium text-brand-600" : "text-chu-phu",
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

      {overflow.length > 0 ? (
        <Drawer
          title="Khác"
          placement="bottom"
          size="default"
          open={overflowOpen}
          onClose={() => setOverflowOpen(false)}
        >
          <div className="flex flex-col gap-1">
            {overflow.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOverflowOpen(false)}
                className={[
                  "flex items-center gap-3 rounded-the px-3 py-2.5 text-base",
                  item.href === activeHref
                    ? "font-medium text-brand-600"
                    : "text-chu-chinh",
                ].join(" ")}
              >
                {NAV_ICONS[item.icon]}
                {item.label}
              </Link>
            ))}
          </div>
        </Drawer>
      ) : null}
    </>
  );
}
