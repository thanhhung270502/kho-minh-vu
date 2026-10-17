"use client";

import { Skeleton } from "antd";
import { useMemo } from "react";

import {
  useAnalysisRows,
  useAnalysisSettings,
} from "@/features/analytics/hooks/useAnalytics";
import { suggestedOrder } from "@/features/analytics/lib/analysis";
import { QueryState } from "@/shared/components/query-state";

import {
  useNegativeStockReport,
  useOverviewKpis,
  usePendingReturns,
  useStockByGroup,
} from "../hooks/useDashboard";
import {
  negativeByWarehouseLabel,
  pendingBreakdownLabel,
} from "../lib/overview-format";
import type { OverviewKpis, PendingReturn } from "../types";
import {
  AttentionRow,
  LOAD_FAILED_HINT,
  type AttentionItem,
} from "./attention-row";

/** Cùng nhịp bán với Danh sách cần nhập ở trang Phân tích. */
const REORDER_PACE_DAYS = 30;
/** Số phiếu trả chờ hiện thành nút — nhiều hơn thì mở dần từ phiếu cũ nhất. */
const PENDING_RETURN_LINKS = 5;

type Counts = {
  /** Không có quyền Xem tồn kho (0128) → bỏ hai việc về tồn âm. */
  canViewStock: boolean;
  reorder: { count: number | null | undefined; description: string } | null;
  negative: number | null | undefined;
  negativeToday: number | null | undefined;
  pendingReturns: PendingReturn[];
};

/**
 * Mỗi loại phiếu chờ một nút. Phiếu trả không có trang danh sách — trước đây nút duy nhất
 * dẫn sang /duyet-don nên chỉ có phiếu trả chờ là bấm vào thấy trống (17/10/2026).
 */
function pendingLinks(
  kpis: OverviewKpis,
  returns: PendingReturn[],
): AttentionItem["links"] {
  const links: AttentionItem["links"] = [];
  if (kpis.pendingReceipts > 0)
    links.push({
      label: "Phiếu nhập",
      href: "/nhap-hang?trang_thai=NHAP_LIEU",
    });
  if (kpis.pendingIssues > 0)
    links.push({ label: "Hóa đơn", href: "/duyet-don?trang_thai=NHAP_LIEU" });
  for (const doc of returns)
    links.push({ label: doc.docNo, href: `/tra-hang/${doc.id}` });
  return links;
}

function buildItems(kpis: OverviewKpis, counts: Counts): AttentionItem[] {
  const items: AttentionItem[] = [];
  if (counts.reorder) {
    items.push({
      key: "reorder",
      title: "Cần nhập hàng",
      count: counts.reorder.count,
      description: counts.reorder.description,
      dot: "bg-canh-bao",
      links: [{ label: "Xem danh sách", href: "/phan-tich#can-nhap" }],
    });
  }
  if (counts.canViewStock) {
    items.push(
      {
        key: "negative",
        title: "Mã tồn âm",
        count: counts.negative,
        description: negativeByWarehouseLabel(kpis.negativeByWarehouse),
        dot: "bg-nguy-hiem",
        links: [{ label: "Kiểm kê", href: "/kiem-ke" }],
      },
      {
        key: "negative-today",
        title: "Phiếu xuất âm hôm nay",
        count: counts.negativeToday,
        description: "Đã xuất khi tồn không đủ — kiểm phiếu nhập còn thiếu",
        dot: "bg-nguy-hiem",
        links: [{ label: "Xem phiếu", href: "#xuat-am" }],
      },
    );
  }
  items.push({
    key: "pending",
    title: "Phiếu chờ hoàn thành",
    count: kpis.pendingDocs,
    description: pendingBreakdownLabel(
      kpis.pendingDocs,
      kpis.pendingReceipts,
      kpis.pendingIssues,
    ),
    dot: "bg-trung-tinh-400",
    links: pendingLinks(kpis, counts.pendingReturns),
  });
  return items;
}

/** undefined = đang tải, null = lỗi — cùng quy ước với cột số của AttentionRow. */
function stateOf<T>(
  query: { isPending: boolean; isError: boolean; data?: T },
  pick: (data: T) => number,
) {
  if (query.isPending) return undefined;
  if (query.isError || query.data === undefined) return null;
  return pick(query.data);
}

/**
 * Việc cần xử lý hôm nay. "Cần nhập hàng" cùng con số với thẻ "Mã cần nhập" của
 * trang Phân tích (đề nghị nhập > 0, nhịp bán 30 ngày) — chỉ hiện với người được xem Phân tích.
 */
export function AttentionPanel({
  canViewAnalysis,
  canViewStock,
}: {
  canViewAnalysis: boolean;
  canViewStock: boolean;
}) {
  const overview = useOverviewKpis();
  const pendingReturnCount = overview.data
    ? overview.data.pendingDocs -
      overview.data.pendingReceipts -
      overview.data.pendingIssues
    : 0;
  const pendingReturns = usePendingReturns(PENDING_RETURN_LINKS, {
    enabled: pendingReturnCount > 0,
  });
  // ton_theo_nhom / bao_cao_xuat_am chặn khi thiếu quyền Xem tồn kho (0128) — không gọi.
  const groups = useStockByGroup("category", null, { enabled: canViewStock });
  const negativeToday = useNegativeStockReport(null, { enabled: canViewStock });
  const analysisRows = useAnalysisRows(REORDER_PACE_DAYS, {
    enabled: canViewAnalysis,
  });
  const settings = useAnalysisSettings({ enabled: canViewAnalysis });

  const reorder = useMemo(() => {
    if (!canViewAnalysis) return null;
    if (analysisRows.isPending || settings.isPending)
      return { count: undefined, description: "" };
    if (!analysisRows.data || !settings.data)
      return { count: null, description: LOAD_FAILED_HINT };
    const coverDays = settings.data.coverDays;
    let count = 0;
    let quantity = 0;
    let outOfStock = 0;
    for (const row of analysisRows.data) {
      const qty = suggestedOrder(row, coverDays);
      if (qty <= 0) continue;
      count += 1;
      quantity += qty;
      if (row.stock <= 0) outOfStock += 1;
    }
    const n = (v: number) => v.toLocaleString("vi-VN");
    return {
      count,
      description: `Tổng ${n(quantity)} cần nhập cho ${coverDays} ngày bán · ${n(outOfStock)} mã đã hết`,
    };
  }, [
    canViewAnalysis,
    analysisRows.isPending,
    analysisRows.data,
    settings.isPending,
    settings.data,
  ]);

  return (
    <section className="flex flex-col gap-1 rounded-[18px] border border-[#D6E6FB] bg-linear-to-b from-brand-50 to-brand-25 p-5">
      <QueryState
        query={overview}
        skeleton={<Skeleton active paragraph={{ rows: 6 }} />}
      >
        {(kpis) => {
          const items = buildItems(kpis, {
            canViewStock,
            reorder,
            negative: stateOf(groups, (rows) =>
              rows.reduce((total, row) => total + row.negative, 0),
            ),
            negativeToday: stateOf(negativeToday, (lines) => lines.length),
            pendingReturns: pendingReturns.data ?? [],
          });
          const open = items.filter((item) => (item.count ?? 0) > 0).length;
          return (
            <>
              <div className="flex items-baseline justify-between pb-2">
                <span className="text-[16px] font-extrabold">Cần xử lý</span>
                <span className="text-[14.5px] text-trung-tinh-350">
                  {open} việc
                </span>
              </div>
              {items.map((item) => (
                <AttentionRow key={item.key} item={item} />
              ))}
            </>
          );
        }}
      </QueryState>
    </section>
  );
}
