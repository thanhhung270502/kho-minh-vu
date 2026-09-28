"use client";

import { DownOutlined } from "@ant-design/icons";
import { Dropdown } from "antd";
import Link from "next/link";
import { useState } from "react";

import { AccountMenu } from "@/shared/components/account-menu";
import type { NavItem } from "@/shared/lib/navigation";
import type { Role } from "@/shared/lib/permissions";

import { cn } from "../utils/cn";
import { NAV_ICONS } from "./nav-icons";
import { useNavOverflow } from "./use-nav-overflow";

type TopNavProps = {
  user: { fullName: string; role: Role };
  items: NavItem[];
  activeHref: string;
};

/**
 * Thanh điều hướng ngang dạng pill — dựng bằng thẻ HTML thường + next/link,
 * không dùng antd Menu (pill nền xanh không ép được qua token antd). Vì
 * không phải component antd nên Tailwind ở đây là đúng chỗ, không cần `!`.
 */
const PILL_CLASS =
  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-2 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/25";

function PillLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="relative">
      {label}
      {active ? (
        <span className="absolute left-1/2 top-6 h-0.75 w-10 -translate-x-1/2 rounded-full bg-white" />
      ) : null}
    </span>
  );
}

function MoreLabel({ active }: { active: boolean }) {
  return (
    <>
      <PillLabel label="Khác" active={active} />
      <DownOutlined className="text-xs" />
    </>
  );
}

export function TopNav({ user, items, activeHref }: TopNavProps) {
  const { containerRef, measureRef, visibleCount } = useNavOverflow(items.length);
  const visible = items.slice(0, visibleCount);
  const overflow = items.slice(visibleCount);
  const activeIsInOverflow = overflow.some((item) => item.href === activeHref);
  // TopNav không unmount khi chuyển trang — tự đóng, kẻo menu lơ lửng trên trang mới.
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <header
      data-no-print
      className="sticky top-0 z-20 border-b border-vien bg-nen-the"
    >
      <div className="flex h-14 items-center gap-3 px-4 lg:px-6">
        <Link href="/" className="shrink-0 font-semibold text-chu-chinh">
          Kho Minh Vũ
        </Link>

        {/*
          Khung đo: chiếm hết chỗ trống giữa logo và tài khoản. Mục nào không
          vừa thì gộp vào "Khác" (như KiotViet) thay vì để chữ xuống dòng.
        */}
        <div ref={containerRef} className="relative hidden min-w-0 flex-1 lg:block">
          {/*
            Pill nav — chỉ hiện từ 992px, dưới đó đã có thanh tab đáy. Nền là
            gradient + viền + đổ bóng nhẹ (giá trị trích xuất thật từ KiotViet),
            không phải màu đặc nên cần style riêng — Tailwind color scale không
            biểu diễn được gradient 2 điểm dừng chính xác từ token.
          */}
          <nav
            className="flex w-fit max-w-full items-center gap-0.5 rounded-full p-px"
            style={{
              background:
                "linear-gradient(0deg, var(--color-brand-500) 0%, var(--color-brand-400) 100%)",
              border: "1px solid var(--color-brand-500)",
              boxShadow: "0 0 4px 0 rgba(0,112,244,.15)",
            }}
          >
            {visible.map((item) => {
              const active = item.href === activeHref;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(PILL_CLASS, active ? "bg-white/25" : "")}
                >
                  {NAV_ICONS[item.icon]}
                  <PillLabel label={item.label} active={active} />
                </Link>
              );
            })}

            {overflow.length > 0 ? (
              <Dropdown
                placement="bottomLeft"
                open={moreOpen}
                onOpenChange={setMoreOpen}
                menu={{
                  onClick: () => setMoreOpen(false),
                  selectedKeys: [activeHref],
                  items: overflow.map((item) => ({
                    key: item.href,
                    icon: NAV_ICONS[item.icon],
                    label: <Link href={item.href}>{item.label}</Link>,
                  })),
                }}
              >
                <button
                  type="button"
                  className={cn(
                    PILL_CLASS,
                    "cursor-pointer border-0 bg-transparent",
                    activeIsInOverflow ? "bg-white/25" : "",
                  )}
                >
                  <MoreLabel active={activeIsInOverflow} />
                </button>
              </Dropdown>
            ) : null}
          </nav>

          {/* Hàng đo ẩn: mọi pill + pill "Khác" (phải đứng cuối) ở bề rộng thật. */}
          <div
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute top-0 left-0 flex w-max"
          >
            {items.map((item) => (
              <span key={item.href} className={PILL_CLASS}>
                {NAV_ICONS[item.icon]}
                <PillLabel label={item.label} active={false} />
              </span>
            ))}
            <span className={PILL_CLASS}>
              <MoreLabel active={false} />
            </span>
          </div>
        </div>

        <div className="ms-auto shrink-0">
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}
