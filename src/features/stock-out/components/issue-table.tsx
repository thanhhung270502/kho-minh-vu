"use client";

import { Button } from "antd";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";

import { ListLayout } from "@/shared/components/list-layout";
import { QueryState } from "@/shared/components/query-state";

import { useIssues } from "../hooks/useIssues";
import {
  DEFAULT_ISSUE_FILTER,
  countActiveIssueFilters,
  readIssueFilterFromUrl,
  writeIssueFilterToUrl,
  type IssueFilter,
} from "../schemas/issue.schema";
import { CreateIssueButton } from "./create-issue-button";
import { IssueFilterPanel } from "./issue-filter-panel";
import { IssueTableBody } from "./issue-table-body";
import { IssueToolbar } from "./issue-toolbar";

export function IssueTable({ canCreate }: { canCreate: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filter = useMemo(() => readIssueFilterFromUrl(searchParams), [searchParams]);
  const issues = useIssues(filter);

  const changeFilter = useCallback(
    (next: IssueFilter) => {
      const query = writeIssueFilterToUrl(next).toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [router, pathname],
  );

  const rows = issues.data?.rows ?? [];
  const total = issues.data?.total ?? 0;

  // Trang cuối cạn sau khi lọc lại — về trang 1 thay vì hiện "không có gì".
  useEffect(() => {
    if (issues.isPending || issues.isFetching) return;
    if (filter.page > 1 && rows.length === 0) changeFilter({ ...filter, page: 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [issues.isPending, issues.isFetching, rows.length, filter.page]);

  const hasActiveFilter = countActiveIssueFilters(filter) > 0;

  return (
    <ListLayout
      activeFilterCount={countActiveIssueFilters(filter)}
      filterPanel={<IssueFilterPanel filter={filter} onChange={changeFilter} />}
      toolbar={
        <IssueToolbar
          filter={filter}
          onChange={changeFilter}
          addButton={canCreate ? <CreateIssueButton /> : null}
        />
      }
    >
      <QueryState
        query={issues}
        isEmpty={(page) => page.rows.length === 0}
        emptyDescription={
          filter.q ? (
            `Không có phiếu nào khớp “${filter.q}”.`
          ) : hasActiveFilter ? (
            <div className="flex flex-col items-center gap-3">
              <span>Không có phiếu nào khớp bộ lọc.</span>
              <Button size="small" onClick={() => changeFilter(DEFAULT_ISSUE_FILTER)}>
                Xóa bộ lọc
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span>Chưa có phiếu xuất nào.</span>
              {canCreate ? <CreateIssueButton label="Tạo phiếu đầu tiên" /> : null}
            </div>
          )
        }
      >
        {(page) => (
          <IssueTableBody
            rows={page.rows}
            total={total}
            filter={filter}
            loading={issues.isFetching && !issues.isPending}
            onFilterChange={changeFilter}
          />
        )}
      </QueryState>
    </ListLayout>
  );
}
