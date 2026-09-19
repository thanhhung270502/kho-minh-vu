"use client";

import Link from "next/link";

import { AccountMenu } from "@/shared/components/account-menu";
import type { NavItem } from "@/shared/lib/navigation";
import type { Role } from "@/shared/lib/permissions";

import { cn } from "../utils/cn";
import { NAV_ICONS } from "./nav-icons";

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
export function TopNav({ user, items, activeHref }: TopNavProps) {
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
          Pill nav — chỉ hiện từ 992px, dưới đó đã có thanh tab đáy. Nền là
          gradient + viền + đổ bóng nhẹ (giá trị trích xuất thật từ KiotViet),
          không phải màu đặc nên cần style riêng — Tailwind color scale không
          biểu diễn được gradient 2 điểm dừng chính xác từ token.
        */}
        <nav
          className="hidden items-center gap-0.5 rounded-full p-px lg:flex"
          style={{
            background:
              "linear-gradient(0deg, var(--color-brand-500) 0%, var(--color-brand-400) 100%)",
            border: "1px solid var(--color-brand-500)",
            boxShadow: "0 0 4px 0 rgba(0,112,244,.15)",
          }}
        >
          {items.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-full px-2 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/25",
                  active ? "bg-white/25" : "",
                )}
              >
                {NAV_ICONS[item.icon]}
                <span className="relative">
                  {item.label}
                  {active ? (
                    <span className="absolute left-1/2 top-6 h-0.75 w-10 -translate-x-1/2 rounded-full bg-white" />
                  ) : null}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="ms-auto">
          <AccountMenu user={user} />
        </div>
      </div>
    </header>
  );
}
