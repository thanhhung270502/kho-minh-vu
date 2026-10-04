"use client";

import Link from "next/link";
import type { ReactNode } from "react";

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
  /** Ô tìm toàn cục ở giữa tầng 1 — route ghép vào, shared không import feature. */
  search?: ReactNode;
};

// Chiều cao tầng 1 (h-[60px]) và tầng 2 (h-11 + border-b) phải khớp
// hooks/use-sticky-table-offset.ts.
export function TopNav({ user, entries, activeHref, search }: TopNavProps) {
  const { containerRef, measureRef, visibleCount } = useNavOverflow(
    entries.length,
  );
  const visible = entries.slice(0, visibleCount);
  const overflow = entries.slice(visibleCount);
  const activeIsInOverflow = overflow.some((entry) =>
    entryIsActive(entry, activeHref),
  );

  return (
    <header data-no-print className="sticky top-0 z-20 bg-nen-the">
      <div className="flex h-[60px] items-center gap-4 px-4 max-lg:border-b max-lg:border-vien lg:px-6">
        <Link
          href="/"
          className="flex shrink-0 items-center gap-2.5 text-chu-chinh hover:text-chu-chinh lg:w-[260px]"
        >
          <span className="flex size-7 items-center justify-center rounded-full bg-chu-chinh text-[10.5px] font-extrabold text-white">
            MV
          </span>
          <span className="text-[15px] font-extrabold tracking-[-0.02em]">
            Kho Minh Vũ
          </span>
        </Link>

        <div className="flex min-w-0 flex-1 justify-end lg:justify-center">
          {search}
        </div>

        <div className="flex shrink-0 justify-end lg:w-[260px]">
          <AccountMenu user={user} />
        </div>
      </div>

      {/*
        Tầng 2: khung đo chiếm hết bề ngang. Mục nào không vừa thì gộp vào
        "Khác" thay vì để chữ xuống dòng. Dưới lg đã có thanh tab đáy.
      */}
      <div className="hidden h-11 border-b border-vien px-6 lg:block">
        <div ref={containerRef} className="relative h-full">
          <nav className="flex h-full w-fit max-w-full items-stretch gap-1">
            {visible.map((entry) => {
              const active = entryIsActive(entry, activeHref);
              if (entry.kind === "group") {
                return (
                  <DropdownPill
                    key={entry.key}
                    label={entry.label}
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
                    ? {
                        type: "group" as const,
                        key: entry.key,
                        label: entry.label,
                        children: linkItems(entry),
                      }
                    : {
                        key: entry.item.href,
                        icon: entryIcon(entry),
                        label: (
                          <Link href={entry.item.href}>{entry.label}</Link>
                        ),
                      },
                )}
              />
            ) : null}
          </nav>

          {/* Hàng đo ẩn: mọi tab + tab "Khác" (phải đứng cuối) ở bề rộng thật. */}
          <div
            ref={measureRef}
            aria-hidden
            className="pointer-events-none invisible absolute top-0 left-0 flex w-max"
          >
            {entries.map((entry) => (
              <span key={entry.key} className={PILL_CLASS}>
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
      </div>
    </header>
  );
}
