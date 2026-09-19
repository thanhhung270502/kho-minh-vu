"use client";

import { Button, Table, Tag } from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";
import { SummaryRow } from "@/shared/components/summary-row";

import { readPartnerFilterFromUrl, writePartnerFilterToUrl } from "../api/partner.api";
import { usePartners } from "../hooks/usePartners";
import {
  DEFAULT_PARTNER_FILTER,
  countActivePartnerFilters,
  PARTNER_KIND_COLORS,
  PARTNER_KIND_LABELS,
  type PartnerFilter,
  type PartnerRow,
} from "../types";
import { PartnerDrawer } from "./partner-drawer";
import { PartnerFilterPanel } from "./partner-filter-panel";
import { PartnerToolbar } from "./partner-toolbar";

const PAGE_SIZE = 50;

function hasActiveFilter(filter: PartnerFilter): boolean {
  return (
    filter.q !== "" ||
    filter.kind !== null ||
    filter.activeStatus !== DEFAULT_PARTNER_FILTER.activeStatus
  );
}

export function PartnerTable({ canEdit }: { canEdit: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = readPartnerFilterFromUrl(searchParams);
  const partners = usePartners(filter);
  const [drawer, setDrawer] = useState<{ open: boolean; id: string | null }>({
    open: false,
    id: null,
  });

  const navigate = useCallback(
    (next: PartnerFilter) => {
      const query = writePartnerFilterToUrl(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
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

  const columns: ColumnsType<PartnerRow> = [
    {
      title: "Mã",
      dataIndex: "code",
      width: 130,
      fixed: "left",
      render: (code: string, row) => <Link href={`/doi-tac/${row.id}`}>{code}</Link>,
    },
    { title: "Tên đối tác", dataIndex: "name", width: 260, ellipsis: true },
    {
      title: "Loại",
      dataIndex: "kind",
      width: 130,
      render: (kind: PartnerRow["kind"]) => (
        <Tag color={PARTNER_KIND_COLORS[kind]}>{PARTNER_KIND_LABELS[kind]}</Tag>
      ),
    },
    { title: "Điện thoại", dataIndex: "phone", width: 130 },
    { title: "Địa chỉ", dataIndex: "address", width: 240, ellipsis: true },
    {
      title: "Trạng thái",
      dataIndex: "isActive",
      width: 110,
      render: (isActive: boolean) => <Tag>{isActive ? "Đang dùng" : "Ngừng"}</Tag>,
    },
    ...(canEdit
      ? [
          {
            title: "",
            key: "actions",
            width: 70,
            fixed: "right" as const,
            render: (_: unknown, row: PartnerRow) => (
              <Button
                type="link"
                size="small"
                className="px-0"
                onClick={() => setDrawer({ open: true, id: row.id })}
              >
                Sửa
              </Button>
            ),
          },
        ]
      : []),
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
            onAdd={() => setDrawer({ open: true, id: null })}
          />
        }
        activeFilterCount={countActivePartnerFilters(filter)}
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
              "Chưa có đối tác nào. Bấm “Thêm đối tác” để tạo nhà cung cấp hoặc khách hàng đầu tiên."
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
              scroll={{ x: 900 }}
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

      <PartnerDrawer
        id={drawer.id}
        open={drawer.open}
        onClose={() => setDrawer((state) => ({ ...state, open: false }))}
      />
    </>
  );
}
