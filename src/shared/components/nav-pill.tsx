"use client";

import { DownOutlined } from "@ant-design/icons";
import { Dropdown, type MenuProps } from "antd";
import Link from "next/link";
import { useState, type ReactNode } from "react";

import type { NavEntry } from "@/shared/lib/navigation";

import { cn } from "../utils/cn";
import { NAV_ICONS } from "./nav-icons";

/**
 * Thanh điều hướng ngang — dựng bằng thẻ HTML thường + next/link, không dùng
 * antd Menu. Vì không phải component antd nên Tailwind ở đây là đúng chỗ,
 * không cần `!`. Kiểu design 1A: chữ xám trên nền trắng, mục đang chọn là
 * khối mực đen chữ trắng.
 */
export const PILL_CLASS =
  "flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-2.5 py-[7px] text-[13.5px] font-medium transition-colors duration-150";

/** Lớp màu theo trạng thái — tách khỏi PILL_CLASS để hàng đo ẩn dùng chung kích thước. */
export function pillTone(active: boolean): string {
  return active
    ? "bg-brand-500 text-white hover:text-white"
    : "text-trung-tinh-500 hover:bg-trung-tinh-75 hover:text-chu-chinh";
}

export function PillLabel({ label }: { label: string }) {
  return <span>{label}</span>;
}

export function DropdownLabel({ label }: { label: string }) {
  return (
    <>
      <PillLabel label={label} />
      <DownOutlined className="text-[10px] opacity-70" />
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
        className={cn(PILL_CLASS, "cursor-pointer border-0 bg-transparent", pillTone(active))}
      >
        {icon}
        <DropdownLabel label={label} />
      </button>
    </Dropdown>
  );
}
