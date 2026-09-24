"use client";

import { Button, Grid, Segmented, Tabs } from "antd";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useStocktakeSession } from "../hooks/useStocktake";
import { CountDeskTable } from "./count-desk-table";
import { CountExcelImport } from "./count-excel-import";
import { CountMobile } from "./count-mobile";
import { DiscrepancyTable } from "./discrepancy-table";
import { SessionHeader } from "./session-header";
import { UncountedPanel } from "./uncounted-panel";

type Props = { sessionId: string; canCount: boolean; canApprove: boolean };

type TabKey = "dem" | "lech" | "excel";

const TAB_PARAM = "tab";
const DEFAULT_TAB: TabKey = "dem";

function readTab(value: string | null): TabKey {
  if (value === "lech" || value === "excel") return value;
  return DEFAULT_TAB;
}

/**
 * Trang chi tiết phiên kiểm kê (D-04): ba đường đếm + bảng lệch/duyệt + nhập
 * Excel dưới một đầu phiên. Tab đang chọn giữ trên URL (`?tab=`) để F5 không
 * mất — khuôn `history-screen.tsx` (URL là nguồn sự thật cho state điều hướng).
 */
export function SessionDetail({ sessionId, canCount, canApprove }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const screens = Grid.useBreakpoint();

  const session = useStocktakeSession(sessionId);
  const [countView, setCountView] = useState<"dien_thoai" | "bang">(() =>
    screens.md ? "bang" : "dien_thoai",
  );

  const activeTab = readTab(searchParams.get(TAB_PARAM));

  function changeTab(key: string) {
    const query = new URLSearchParams(searchParams);
    if (key === DEFAULT_TAB) query.delete(TAB_PARAM);
    else query.set(TAB_PARAM, key);
    const search = query.toString();
    router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
  }

  return (
    <QueryState
      query={session}
      isEmpty={(data) => data === null}
      emptyDescription={
        <div className="flex flex-col items-center gap-3">
          <span>Không tìm thấy phiên kiểm kê này, hoặc phiên thuộc kho bạn không được phân.</span>
          <Link href="/kiem-ke">
            <Button size="small">Về danh sách phiên</Button>
          </Link>
        </div>
      }
    >
      {(data) => {
        if (!data) return null;

        const editable = canCount && data.state === "NHAP_LIEU";

        return (
          <>
            <Link href="/kiem-ke" className="mb-2 inline-block text-sm">
              ← Phiên kiểm kê
            </Link>

            <SessionHeader session={data} canVoid={canApprove} />

            <Tabs
              activeKey={activeTab}
              onChange={changeTab}
              items={[
                {
                  key: "dem",
                  label: "Đếm",
                  children: (
                    <div className="flex flex-col gap-3">
                      <Segmented
                        value={countView}
                        onChange={(value) => setCountView(value as "dien_thoai" | "bang")}
                        options={[
                          { label: "Điện thoại", value: "dien_thoai" },
                          { label: "Bảng", value: "bang" },
                        ]}
                      />
                      {countView === "dien_thoai" ? (
                        <CountMobile sessionId={sessionId} editable={editable} />
                      ) : (
                        <CountDeskTable sessionId={sessionId} editable={editable} />
                      )}
                    </div>
                  ),
                },
                {
                  key: "lech",
                  label: "Bảng lệch & duyệt",
                  children: (
                    <div className="flex flex-col gap-6">
                      <UncountedPanel
                        sessionId={sessionId}
                        editable={editable}
                        canApprove={canApprove}
                      />
                      <DiscrepancyTable
                        sessionId={sessionId}
                        editable={editable}
                        canApprove={canApprove}
                      />
                    </div>
                  ),
                },
                {
                  key: "excel",
                  label: "Nhập Excel",
                  children: <CountExcelImport sessionId={sessionId} editable={editable} />,
                },
              ]}
            />
          </>
        );
      }}
    </QueryState>
  );
}
