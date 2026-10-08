"use client";

import { DownOutlined } from "@ant-design/icons";
import { Dropdown, type MenuProps } from "antd";
import Link from "next/link";
import { useState } from "react";

import type { NavEntry } from "@/shared/lib/navigation";

import { cn } from "../utils/cn";
import { NAV_ICONS } from "./nav-icons";

/**
 * Thanh điều hướng ngang — dựng bằng thẻ HTML thường + next/link, không dùng
 * antd Menu. Vì không phải component antd nên Tailwind ở đây là đúng chỗ,
 * không cần `!`. Kiểu 3b: tab chữ, mục đang chọn gạch chân 2px đen.
 */
export const PILL_CLASS =
  "-mb-px flex h-full shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 px-2.5 text-[15.5px] transition-colors duration-150";

/** Lớp màu theo trạng thái — tách khỏi PILL_CLASS để hàng đo ẩn dùng chung kích thước. */
export function pillTone(active: boolean): string {
  return active
    ? "border-chu-chinh font-bold text-chu-chinh hover:text-chu-chinh"
    : "border-transparent font-semibold text-chu-phu hover:text-chu-chinh";
}

export function PillLabel({ label }: { label: string }) {
  return <span>{label}</span>;
}

export function DropdownLabel({ label }: { label: string }) {
  return (
    <>
      <PillLabel label={label} />
      <DownOutlined className="text-[11px] text-trung-tinh-300" />
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
  items,
  activeHref,
}: {
  label: string;
  active: boolean;
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
        <DropdownLabel label={label} />
      </button>
    </Dropdown>
  );
}
