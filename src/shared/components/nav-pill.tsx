"use client";

import { DownOutlined } from "@ant-design/icons";
import { Dropdown, type MenuProps } from "antd";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { NavEntry } from "@/shared/lib/navigation";

import { cn } from "../utils/cn";
import { NAV_ICONS } from "./nav-icons";

/**
 * Thanh điều hướng ngang dạng pill — dựng bằng thẻ HTML thường + next/link,
 * không dùng antd Menu (pill nền xanh không ép được qua token antd). Vì
 * không phải component antd nên Tailwind ở đây là đúng chỗ, không cần `!`.
 */
export const PILL_CLASS =
  "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-full px-2 py-2.5 text-sm font-semibold text-white transition-all duration-200 ease-in-out hover:bg-white/25";

export function PillLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <span className="relative">
      {label}
      {active ? (
        <span className="absolute left-1/2 top-6 h-0.75 w-10 -translate-x-1/2 rounded-full bg-white" />
      ) : null}
    </span>
  );
}

export function DropdownLabel({ label, active }: { label: string; active: boolean }) {
  return (
    <>
      <PillLabel label={label} active={active} />
      <DownOutlined className="text-xs" />
    </>
  );
}

export function entryIsActive(entry: NavEntry, activeHref: string): boolean {
  return entry.kind === "item"
    ? entry.item.href === activeHref
    : entry.items.some((item) => item.href === activeHref);
}

export function entryIcon(entry: NavEntry) {
  return NAV_ICONS[entry.kind === "item" ? entry.item.icon : entry.icon];
}

/** Mục con của một nhóm, dùng chung cho dropdown nhóm và nhóm trong "Khác". */
export function linkItems(entry: Extract<NavEntry, { kind: "group" }>) {
  return entry.items.map((item) => ({
    key: item.href,
    icon: NAV_ICONS[item.icon],
    label: <Link href={item.href}>{item.label}</Link>,
  }));
}

/** Pill có dropdown — dùng cho nhóm và cho "Khác". Tự đóng khi bấm một mục. */
export function DropdownPill({
  label,
  active,
  icon,
  items,
  activeHref,
}: {
  label: string;
  active: boolean;
  icon?: ReactNode;
  items: NonNullable<MenuProps["items"]>;
  activeHref: string;
}) {
  // TopNav không unmount khi chuyển trang — tự đóng, kẻo menu lơ lửng trên trang mới.
  const [open, setOpen] = useState(false);
  return (
    <Dropdown
      placement="bottomLeft"
      open={open}
      onOpenChange={setOpen}
      menu={{ onClick: () => setOpen(false), selectedKeys: [activeHref], items }}
    >
      <button
        type="button"
        aria-current={active ? "page" : undefined}
        className={cn(PILL_CLASS, "cursor-pointer border-0 bg-transparent", active ? "bg-white/25" : "")}
      >
        {icon}
        <DropdownLabel label={label} active={active} />
      </button>
    </Dropdown>
  );
}
