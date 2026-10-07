"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Button, Input, Modal, Skeleton } from "antd";
import type { InputRef } from "antd";
import { useRouter } from "next/navigation";
import { useRef, useState, type KeyboardEvent } from "react";

import { explainError } from "@/shared/lib/errors";

import { useGlobalSearch } from "../hooks/useGlobalSearch";
import {
  defaultActiveIndex,
  groupSearchResults,
  searchResultHref,
} from "../lib/search-results";
import type { GlobalSearchResult } from "../types";
import { SearchResultList } from "./search-result-list";

type GlobalSearchModalProps = { open: boolean; onClose: () => void };

const KBD = "rounded border border-[#E5E5E5] bg-white px-1.5 font-mono text-[12px]";

export function GlobalSearchModal({ open, onClose }: GlobalSearchModalProps) {
  const router = useRouter();
  const inputRef = useRef<InputRef>(null);
  const [text, setText] = useState("");
  const [activeKey, setActiveKey] = useState<string | null>(null);

  const search = useGlobalSearch(text);
  const groups = groupSearchResults(search.data ?? []);
  const flat = groups
    .flatMap((g) => g.items)
    .filter((item) => searchResultHref(item) !== null);
  const fallback = flat[defaultActiveIndex(flat, search.debouncedQuery)];
  const active = flat.find((i) => i.key === activeKey) ?? fallback ?? null;

  const openItem = (item: GlobalSearchResult) => {
    const href = searchResultHref(item);
    if (!href) return;
    onClose();
    router.push(href);
  };

  const move = (step: 1 | -1) => {
    if (flat.length === 0) return;
    const current = active ? flat.findIndex((i) => i.key === active.key) : -1;
    const next = flat[(current + step + flat.length) % flat.length];
    if (!next) return;
    setActiveKey(next.key);
    setTimeout(() => {
      document.getElementById(`kq-${next.key}`)?.scrollIntoView({ block: "nearest" });
    }, 0);
  };

  // Bẫy 13: công cụ thử có thể gửi key rỗng — đối chiếu thêm e.code.
  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown" || e.code === "ArrowDown") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowUp" || e.code === "ArrowUp") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Enter" || e.code === "Enter" || e.code === "NumpadEnter") {
      e.preventDefault();
      if (active) openItem(active);
    }
  };

  const tooShort = text.trim().length < 2;
  const loading = search.isPending && search.fetchStatus === "fetching";

  let body;
  if (tooShort) {
    body = (
      <p className="m-0 px-4 py-4 text-[14px] text-trung-tinh-350">
        Gõ ít nhất 2 ký tự · <kbd className={KBD}>↑</kbd> <kbd className={KBD}>↓</kbd> chọn ·{" "}
        <kbd className={KBD}>Enter</kbd> mở · <kbd className={KBD}>Esc</kbd> đóng
      </p>
    );
  } else if (search.isError) {
    const explained = explainError(search.error);
    body = (
      <div className="flex items-center justify-between gap-3 px-4 py-4 text-[14px]">
        <span>
          {explained.title}. {explained.action}
        </span>
        <Button size="small" onClick={() => void search.refetch()}>
          Thử lại
        </Button>
      </div>
    );
  } else if (loading) {
    body = (
      <div className="px-4 py-4">
        <Skeleton active title={false} paragraph={{ rows: 3 }} />
      </div>
    );
  } else if (flat.length === 0) {
    body = (
      <p className="m-0 px-4 py-4 text-[14px] text-trung-tinh-350">
        Không tìm thấy “{search.debouncedQuery}”. Thử mã đầy đủ hoặc số phiếu.
      </p>
    );
  } else {
    body = (
      <div className="max-h-[420px] overflow-y-auto">
        <SearchResultList
          groups={groups}
          activeKey={active?.key ?? null}
          onPick={openItem}
          onHover={setActiveKey}
        />
      </div>
    );
  }

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      closable={false}
      width={600}
      style={{ top: 80 }}
      destroyOnHidden
      afterOpenChange={(o) => {
        if (o) inputRef.current?.focus();
      }}
      styles={{ body: { padding: 0 } }}
    >
      <div onKeyDown={onKeyDown}>
        <Input
          ref={inputRef}
          autoFocus
          size="large"
          variant="borderless"
          prefix={<SearchOutlined />}
          placeholder="Tìm mã hàng, số phiếu, đối tác…"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setActiveKey(null);
          }}
        />
        <div className="border-t border-[#E5E5E5]" />
        {body}
      </div>
    </Modal>
  );
}
