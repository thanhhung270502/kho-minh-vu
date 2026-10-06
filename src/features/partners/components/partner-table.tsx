"use client";

import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";

import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";
import { SummaryRow } from "@/shared/components/summary-row";
import { isInteractiveTarget, readSelectedId, withSelectedId } from "@/shared/lib/selected-id";

import { readPartnerFilterFromUrl, writePartnerFilterToUrl } from "../lib/partner-filter-url";
import { usePartners } from "../hooks/usePartners";
import {
  DEFAULT_PARTNER_FILTER,
  countActivePartnerFilters,
  PARTNER_KIND_LABELS,
  type PartnerFilter,
  type PartnerRow,
} from "../types";
import { PartnerDrawer } from "./partner-drawer";
import { PartnerFilterPanel } from "./partner-filter-panel";
import { PartnerPanel } from "./partner-panel";
import { PartnerToolbar } from "./partner-toolbar";

const PAGE_SIZE = 50;

function hasActiveFilter(filter: PartnerFilter): boolean {
  return filter.q !== "" || filter.activeStatus !== DEFAULT_PARTNER_FILTER.activeStatus;
}

export function PartnerTable({ canEdit, excelActions }: { canEdit: boolean; excelActions?: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Bỏ `?loai=` của link cũ — trang này không còn lọc theo loại.
  const filter: PartnerFilter = { ...readPartnerFilterFromUrl(searchParams), kind: null };
  const selectedId = readSelectedId(searchParams);
  // Trang Đối tác chỉ còn nhà cung cấp — RPC lọc "NCC" trả cả đối tác "Cả hai".
  // Khách hàng vẫn chọn được khi tạo đơn đặt, chỉ không liệt kê ở đây.
  const partners = usePartners({ ...filter, kind: "NCC" });
  // Sửa đối tác nằm trong panel chi tiết — ngăn kéo ở đây chỉ còn để thêm mới.
  const [addOpen, setAddOpen] = useState(false);

  const replaceUrl = useCallback(
    (params: URLSearchParams) => {
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  // Đổi bộ lọc/trang vẫn giữ panel đang mở.
  const navigate = useCallback(
    (next: PartnerFilter) => replaceUrl(withSelectedId(writePartnerFilterToUrl(next), selectedId)),
    [replaceUrl, selectedId],
  );

  const selectPartner = useCallback(
    (id: string | null) => replaceUrl(withSelectedId(searchParams, id)),
    [replaceUrl, searchParams],
  );

  // Đổi bất kỳ điều kiện nào cũng về trang 1: giữ nguyên trang cũ thì rất dễ
  // rơi vào trang trống và tưởng là không có dữ liệu.
  function changeFilter(patch: Partial<PartnerFilter>) {
    navigate({ ...filter, ...patch, page: 1 });
  }

  // Xóa đối tác cuối của một trang (hoặc sửa loại) làm trang đang xem biến mất.
  const rows = partners.data?.rows ?? [];
  const total = partners.data?.total ?? 0;
  useEffect(() => {
    if (partners.isPending || partners.isFetching) return;
    if (filter.page > 1 && rows.length === 0) navigate({ ...filter, page: 1 });
    // `filter` dựng lại mỗi lần render nên chỉ theo dõi các giá trị thật sự đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [partners.isPending, partners.isFetching, rows.length, filter.page]);

  // Năm cột (PANEL-02) — địa chỉ, ghi chú, nút Sửa nằm trong panel chi tiết.
  const columns: ColumnsType<PartnerRow> = [
    {
      title: "Mã",
      dataIndex: "code",
      width: 130,
      fixed: "left",
      render: (code: string) => <span className="font-mono text-brand-500">{code}</span>,
    },
    { title: "Tên đối tác", dataIndex: "name", width: 260, ellipsis: true },
    {
      title: "Loại",
      dataIndex: "kind",
      width: 130,
      render: (kind: PartnerRow["kind"], row) => (
        <>
          <Tag>{PARTNER_KIND_LABELS[kind]}</Tag>
          {row.isActive ? null : <Tag>Ngừng</Tag>}
        </>
      ),
    },
    { title: "Điện thoại", dataIndex: "phone", width: 130 },
    {
      title: "Tổng giao dịch",
      dataIndex: "transactionCount",
      width: 120,
      align: "right",
      className: "tabular-nums",
      render: (count: number) => count.toLocaleString("vi-VN"),
    },
  ];

  return (
    <>
      <ListLayout
        filterPanel={
          <PartnerFilterPanel filter={filter} onChange={changeFilter} />
        }
        toolbar={
          <PartnerToolbar
            filter={filter}
            canEdit={canEdit}
            onChange={changeFilter}
            onAdd={() => setAddOpen(true)}
            excelActions={excelActions}
          />
        }
        activeFilterCount={countActivePartnerFilters(filter)}
        detailPanel={
          selectedId ? (
            <PartnerPanel
              partnerId={selectedId}
              permissions={{ canEdit, canViewHistory: canEdit }}
              onClose={() => selectPartner(null)}
            />
          ) : null
        }
      >
        <QueryState
          query={partners}
          isEmpty={(page) => page.rows.length === 0}
          emptyDescription={
            hasActiveFilter(filter) ? (
              <div className="flex flex-col items-center gap-3">
                <span>Không có đối tác khớp bộ lọc. Xóa bớt điều kiện tìm.</span>
                <Button size="small" onClick={() => navigate(DEFAULT_PARTNER_FILTER)}>
                  Xóa bộ lọc
                </Button>
              </div>
            ) : (
              "Chưa có nhà cung cấp nào. Bấm “Thêm nhà cung cấp” để tạo nhà cung cấp đầu tiên."
            )
          }
        >
          {(page) => (
            <Table<PartnerRow>
              rowKey="id"
              size="small"
              columns={columns}
              dataSource={page.rows}
              loading={partners.isFetching}
              scroll={{ x: 700 }}
              rowClassName={(row) =>
                row.id === selectedId ? "cursor-pointer [&>td]:bg-brand-50" : "cursor-pointer"
              }
              onRow={(row) => ({
                onClick: (event) => {
                  if (!isInteractiveTarget(event.target as Element)) selectPartner(row.id);
                },
              })}
              summary={() => (
                <SummaryRow
                  columns={columns}
                  hasSelection={false}
                  label={`Tổng cộng — ${total.toLocaleString("vi-VN")} đối tác`}
                />
              )}
              pagination={{
                current: filter.page,
                pageSize: PAGE_SIZE,
                total,
                showSizeChanger: false,
                showTotal: (count) => `${count} đối tác`,
                onChange: (page) => navigate({ ...filter, page }),
              }}
            />
          )}
        </QueryState>
      </ListLayout>

      <PartnerDrawer id={null} open={addOpen} onClose={() => setAddOpen(false)} />
    </>
  );
}
