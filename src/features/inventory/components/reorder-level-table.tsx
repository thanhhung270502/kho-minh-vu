"use client";

import { App, Button, Segmented, Table, Typography } from "antd";
import Link from "next/link";
import { useState, type Key } from "react";

import { QueryState } from "@/shared/components/query-state";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { REORDER_SUGGESTION_PAGE_SIZE } from "../api/inventory.api";
import {
  useApplyReorderLevels,
  useReorderSuggestions,
} from "../hooks/useInventory";
import {
  SUGGESTION_BASES,
  SUGGESTION_BASIS_LABELS,
  type ReorderSuggestion,
  type SuggestionBasis,
} from "../types";
import { ARCHIVE_SNAPSHOT, ReorderDataWarning } from "./reorder-data-warning";
import {
  REORDER_LEVEL_COLUMNS,
  REORDER_LEVEL_TABLE_WIDTH,
} from "./reorder-level-columns";

type BasisOption = SuggestionBasis | "all";

const BASIS_OPTIONS = [
  { value: "all" as const, label: "Tất cả" },
  ...SUGGESTION_BASES.map((basis) => ({
    value: basis,
    label: SUGGESTION_BASIS_LABELS[basis],
  })),
];

/**
 * "Chưa có dữ liệu" luôn đề xuất 0. Màn chỉ lấy mã có đề xuất khác định mức đang
 * đặt, nên dòng loại này chỉ hiện khi mã ĐANG có định mức — duyệt nó là xóa định
 * mức đó về 0. Không chọn sẵn; người duyệt muốn thật thì tự tick.
 */
function selectedByDefault(row: ReorderSuggestion): boolean {
  return row.basis !== "khong_du_lieu";
}

function describeApplyError(error: unknown): string {
  const code = errorCode(error);
  if (code === "42501") {
    return "Tài khoản của bạn không được duyệt định mức — chỉ quản lý và văn phòng duyệt được. Nếu vai trò vừa được đổi, tải lại trang rồi thử lại; vẫn bị chặn thì liên hệ quản lý.";
  }
  // Ràng buộc do chính RPC đặt (vd "Tối đa 1000 mã mỗi lần") — nguyên văn đã đủ nghĩa.
  if (code === "23514" && isPostgrestError(error)) {
    return `Máy chủ từ chối: ${error.message}. Lựa chọn vẫn giữ nguyên — bỏ chọn bớt rồi duyệt lại.`;
  }
  const explained = explainError(error);
  return `${explained.title}. ${explained.action}`;
}

export function ReorderLevelTable() {
  const { message, modal } = App.useApp();
  const [basis, setBasis] = useState<SuggestionBasis | null>(null);
  const [page, setPage] = useState(1);
  const suggestions = useReorderSuggestions(basis, page, true);
  const apply = useApplyReorderLevels();

  // Dòng của mọi trang đã mở kể từ lần duyệt / đổi nguồn gần nhất. Nút duyệt chỉ
  // phủ những gì người duyệt đã thấy — trang chưa mở không bao giờ bị duyệt mù.
  const [viewedPages, setViewedPages] = useState<
    Record<number, ReorderSuggestion[]>
  >({});
  // Chỉ những dòng người duyệt tự đổi khác mặc định.
  const [overrides, setOverrides] = useState(() => new Map<string, boolean>());

  function restartReview() {
    setPage(1);
    setViewedPages({});
  }

  // Chỉnh trong lúc render, không dùng effect (lint react-hooks/set-state-in-effect).
  // Dữ liệu giữ chỗ là của trang trước — chưa tính là trang này đã được xem.
  const loadedRows = suggestions.isPlaceholderData
    ? undefined
    : suggestions.data?.rows;
  if (page > 1 && loadedRows?.length === 0) {
    // Trang cuối cạn vì người khác vừa duyệt — về trang 1.
    restartReview();
  } else if (loadedRows && viewedPages[page] !== loadedRows) {
    setViewedPages({ ...viewedPages, [page]: loadedRows });
  }

  const isSelected = (row: ReorderSuggestion) =>
    overrides.get(row.id) ?? selectedByDefault(row);
  const selectedIds = [
    ...new Set(
      Object.values(viewedPages)
        .flat()
        .filter(isSelected)
        .map((row) => row.id),
    ),
  ];

  function toggle(keys: Key[], rows: ReorderSuggestion[]) {
    const chosen = new Set(keys);
    const next = new Map(overrides);
    for (const row of rows) next.set(row.id, chosen.has(row.id));
    setOverrides(next);
  }

  function changeBasis(next: BasisOption) {
    setBasis(next === "all" ? null : next);
    restartReview();
  }

  async function applySelected(ids: string[]) {
    try {
      const count = await apply.mutateAsync(ids);
      message.success(
        count === ids.length
          ? `Đã duyệt định mức cho ${count} mã.`
          : `Đã duyệt định mức cho ${count}/${ids.length} mã — số còn lại vừa ngừng kinh doanh nên không được ghi.`,
      );
      setOverrides(new Map());
      restartReview();
    } catch (error) {
      message.error({ content: describeApplyError(error), duration: 8 });
    }
  }

  function confirmApply() {
    const ids = selectedIds;
    modal.confirm({
      title: `Duyệt định mức tồn tối thiểu cho ${ids.length} mã?`,
      content:
        "Định mức của các mã này được ghi thẳng vào danh mục hàng, thay số đang đặt, và mỗi mã có một dòng trong nhật ký sửa. Con số do máy chủ tính lại lúc ghi, không lấy từ màn hình.",
      okText: "Duyệt",
      cancelText: "Xem lại",
      onOk: () => applySelected(ids),
    });
  }

  return (
    <>
      <ReorderDataWarning
        dataDays={suggestions.data?.rows[0]?.dataDays ?? ARCHIVE_SNAPSHOT.days}
      />

      <div className="mb-2 flex flex-wrap items-center gap-2">
        <div className="max-w-full overflow-x-auto">
          <Segmented<BasisOption>
            value={basis ?? "all"}
            onChange={changeBasis}
            options={BASIS_OPTIONS}
          />
        </div>
        <Link href="/ton-kho?ton=duoi_dinh_muc" className="ms-auto">
          Xem mã dưới định mức
        </Link>
        <Button
          type="primary"
          disabled={
            selectedIds.length === 0 ||
            apply.isPending ||
            suggestions.isFetching
          }
          loading={apply.isPending}
          onClick={confirmApply}
        >
          Duyệt {selectedIds.length} mã
        </Button>
      </div>
      <Typography.Text type="secondary" className="mb-3 block text-xs">
        Mặc định chọn mọi mã trên các trang bạn đã mở, trừ mã “Chưa có dữ liệu”.
        Trang chưa mở không bị duyệt.
      </Typography.Text>

      <QueryState
        query={suggestions}
        isEmpty={(result) => result.rows.length === 0}
        emptyDescription={
          basis === null
            ? "Không còn mã nào có đề xuất khác định mức đang đặt — mọi định mức đã khớp đề xuất."
            : `Không còn mã “${SUGGESTION_BASIS_LABELS[basis]}” nào có đề xuất khác định mức đang đặt. Chọn “Tất cả” để xem nguồn khác.`
        }
      >
        {(result) => (
          <div className="overflow-x-auto">
            <Table<ReorderSuggestion>
              rowKey="id"
              size="small"
              columns={REORDER_LEVEL_COLUMNS}
              dataSource={result.rows}
              loading={suggestions.isFetching && !suggestions.isPending}
              scroll={{ x: REORDER_LEVEL_TABLE_WIDTH }}
              rowSelection={{
                selectedRowKeys: selectedIds,
                onChange: (keys) => toggle(keys, result.rows),
                // Khóa của trang khác vẫn nằm trong lựa chọn khi đổi trang.
                preserveSelectedRowKeys: true,
              }}
              pagination={{
                current: page,
                pageSize: REORDER_SUGGESTION_PAGE_SIZE,
                total: result.total,
                showSizeChanger: false,
                showTotal: (count) =>
                  `${count.toLocaleString("vi-VN")} mã có đề xuất khác định mức đang đặt`,
                onChange: setPage,
              }}
            />
          </div>
        )}
      </QueryState>
    </>
  );
}
