"use client";

import Link from "next/link";

import { AccountMenu } from "@/shared/components/account-menu";
import type { NavEntry } from "@/shared/lib/navigation";
import type { Role } from "@/shared/lib/permissions";

import { cn } from "../utils/cn";
import {
  DropdownLabel,
  DropdownPill,
  entryIcon,
  entryIsActive,
  linkItems,
  PILL_CLASS,
  PillLabel,
  pillTone,
} from "./nav-pill";
import { useNavOverflow } from "./use-nav-overflow";

type TopNavProps = {
  user: { fullName: string; role: Role };
  /** Mục cấp 1 — mục lẻ hoặc nhóm (Đơn hàng, Hàng hóa) mở dropdown. */
  entries: NavEntry[];
  activeHref: string;
};

export function TopNav({ user, entries, activeHref }: TopNavProps) {
  const { containerRef, measureRef, visibleCount } = useNavOverflow(entries.length);
  const visible = entries.slice(0, visibleCount);
  const overflow = entries.slice(visibleCount);
  const activeIsInOverflow = overflow.some((entry) => entryIsActive(entry, activeHref));

  return (
    <header
      data-no-print
      className="sticky top-0 z-20 border-b border-vien bg-nen-the"
    >
      <div className="flex h-[60px] items-center gap-5 px-4 lg:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-[15px] font-semibold tracking-[-0.01em] text-chu-chinh hover:text-chu-chinh"
        >
          <span className="flex size-[26px] items-center justify-center rounded-[7px] bg-brand-500 text-[11px] font-bold tracking-[-0.02em] text-white">
            MV
          </span>
          Kho Minh Vũ
        </Link>

        {/*
          Khung đo: chiếm hết chỗ trống giữa logo và tài khoản. Mục nào không
          vừa thì gộp vào "Khác" (như KiotViet) thay vì để chữ xuống dòng.
        */}
        <div ref={containerRef} className="relative hidden min-w-0 flex-1 lg:block">
          {/* Nav ngang — chỉ hiện từ 992px, dưới đó đã có thanh tab đáy. */}
          <nav className="flex w-fit max-w-full items-center gap-0.5">
            {visible.map((entry) => {
              const active = entryIsActive(entry, activeHref);
              if (entry.kind === "group") {
                return (
                  <DropdownPill
                    key={entry.key}
                    label={entry.label}
                    icon={entryIcon(entry)}
                    active={active}
                    items={linkItems(entry)}
                    activeHref={activeHref}
                  />
                );
              }
              return (
                <Link
                  key={entry.key}
                  href={entry.item.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(PILL_CLASS, pillTone(active))}
                >
                  {entryIcon(entry)}
                  <PillLabel label={entry.label} />
                </Link>
              );
            })}

            {overflow.length > 0 ? (
              <DropdownPill
                label="Khác"
                active={activeIsInOverflow}
                activeHref={activeHref}
                items={overflow.map((entry) =>
                  entry.kind === "group"
                    ? { type: "group" as const, key: entry.key, label: entry.label, children: linkItems(entry) }
                    : {
                        key: entry.item.href,
                        icon: entryIcon(entry),
                        label: <Link href={entry.item.href}>{entry.label}</Link>,
                      },
                )}
              />
            ) : null}
          </nav>

          {/* Hàng đo ẩn: mọi pill + pill "Khác" (phải đứng cuối) ở bề rộng thật. */}
          <div
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute top-0 left-0 flex w-max"
          >
            {entries.map((entry) => (
              <span key={entry.key} className={PILL_CLASS}>
                {entryIcon(entry)}
                {entry.kind === "group" ? (
                  <DropdownLabel label={entry.label} />
                ) : (
                  <PillLabel label={entry.label} />
                )}
              </span>
            ))}
            <span className={PILL_CLASS}>
              <DropdownLabel label="Khác" />
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
