"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Button } from "antd";
import { useEffect, useState, useSyncExternalStore } from "react";

import { GlobalSearchModal } from "./global-search-modal";

const subscribeNothing = () => () => {};
const isMacClient = () => /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent);

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  // Server snapshot "Ctrl K" để khỏi lệch khi hydrate.
  const isMac = useSyncExternalStore(subscribeNothing, isMacClient, () => false);
  const shortcut = isMac ? "⌘ K" : "Ctrl K";

  useEffect(() => {
    // Chỉ tổ hợp có modifier — không gắn phím đơn toàn cục.
    const onKeyDown = (e: KeyboardEvent) => {
      const isK = e.key?.toLowerCase() === "k" || e.code === "KeyK";
      if ((e.metaKey || e.ctrlKey) && isK) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="hidden h-[38px] w-[440px] max-w-full cursor-pointer items-center gap-2.5 rounded-[10px] border-0 bg-nen-phu px-3 text-left text-[13.5px] text-trung-tinh-350 lg:flex"
      >
        <SearchOutlined style={{ fontSize: 15 }} />
        <span className="flex-1">Tìm mã hàng, số phiếu, đối tác…</span>
        <kbd className="rounded-[5px] border border-[#E5E5E5] bg-white px-1.5 font-mono text-[11px]">
          {shortcut}
        </kbd>
      </button>
      <Button
        className="lg:hidden"
        shape="circle"
        icon={<SearchOutlined />}
        aria-label="Tìm kiếm"
        onClick={() => setOpen(true)}
      />
      <GlobalSearchModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
