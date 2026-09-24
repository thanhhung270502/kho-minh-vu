"use client";

import { SearchOutlined } from "@ant-design/icons";
import { Alert, Input } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { ListLayout } from "@/shared/components/list-layout";

import { useKiotVietHistory } from "../hooks/useKiotVietHistory";
import {
  countActiveHistoryFilters,
  readHistoryFilterFromUrl,
  writeHistoryFilterToUrl,
  type KiotVietHistoryFilter,
} from "../schemas/history-filter.schema";
import { HistoryFilterPanel } from "./history-filter-panel";
import { HistoryTable } from "./history-table";
import { VoucherDrawer } from "./voucher-drawer";

type Voucher = { type: "NHAP" | "XUAT"; voucherNo: string };

export function HistoryScreen() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // URL là nguồn sự thật của bộ lọc: refresh hay gửi link đều giữ nguyên điều kiện.
  const filter = useMemo(
    () => readHistoryFilterFromUrl(searchParams),
    [searchParams],
  );
  const history = useKiotVietHistory(filter);
  const [openVoucher, setOpenVoucher] = useState<Voucher | null>(null);

  const changeFilter = useCallback(
    (next: KiotVietHistoryFilter) => {
      const query = writeHistoryFilterToUrl(next);
      router.replace(query ? `${pathname}?${query}` : pathname, {
        scroll: false,
      });
    },
    [router, pathname],
  );

  // Ô tìm nằm ngoài panel, debounce để không bắn RPC mỗi phím gõ.
  const [keyword, setKeyword] = useState(filter.keyword);
  const [previousKeyword, setPreviousKeyword] = useState(filter.keyword);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Từ khóa đổi từ bên ngoài (Xóa lọc, nút back) — chỉnh trong lúc render,
  // không dùng effect (lint react-hooks/set-state-in-effect).
  if (filter.keyword !== previousKeyword) {
    setPreviousKeyword(filter.keyword);
    setKeyword(filter.keyword);
  }

  useEffect(
    () => () => {
      if (debounce.current) clearTimeout(debounce.current);
    },
    [],
  );

  function search(value: string) {
    changeFilter({ ...filter, keyword: value.trim(), page: 1 });
  }

  function searchDebounced(value: string) {
    setKeyword(value);
    if (debounce.current) clearTimeout(debounce.current);
    debounce.current = setTimeout(() => search(value), 300);
  }

  return (
    <>
      <Alert
        className="mb-3"
        type="info"
        showIcon
        title="594 phiếu nhập và 4.732 hóa đơn từ KiotViet — chỉ để tra cứu, không nằm trong sổ kho, không có tồn lũy kế."
      />

      <ListLayout
        activeFilterCount={countActiveHistoryFilters(filter)}
        filterPanel={<HistoryFilterPanel value={filter} onChange={changeFilter} />}
        toolbar={
          <Input
            allowClear
            value={keyword}
            prefix={<SearchOutlined />}
            placeholder="Tìm khách, NCC, ghi chú, mã (không cần dấu)"
            className="w-full sm:max-w-md"
            onChange={(event) => searchDebounced(event.target.value)}
            onPressEnter={() => {
              if (debounce.current) clearTimeout(debounce.current);
              search(keyword);
            }}
          />
        }
      >
        <HistoryTable
          query={history}
          page={filter.page}
          pageSize={filter.pageSize}
          onPageChange={(page, pageSize) =>
            changeFilter({ ...filter, page, pageSize })
          }
          onOpenVoucher={(type, voucherNo) => setOpenVoucher({ type, voucherNo })}
        />
      </ListLayout>

      <VoucherDrawer voucher={openVoucher} onClose={() => setOpenVoucher(null)} />
    </>
  );
}
