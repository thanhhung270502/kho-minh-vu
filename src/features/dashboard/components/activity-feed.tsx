"use client";

import { Button, Select, Skeleton } from "antd";
import Link from "next/link";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";

import { useActivityFeed } from "../hooks/useDashboard";
import {
  ACTIVITY_DOT,
  ACTIVITY_GROUPS,
  activityHref,
  activityPhrase,
  activityTime,
} from "../lib/activity-format";
import type { ActivityEvent, ActivityGroup } from "../types";

function ActivityRow({ event }: { event: ActivityEvent }) {
  const { verb, object } = activityPhrase(event);
  const href = activityHref(event);
  const target = event.code ?? object;
  return (
    <li className="flex gap-2.5 border-t border-vien-input py-2.5">
      <span className={`mt-[7px] size-1.5 shrink-0 rounded-full ${ACTIVITY_DOT[event.action]}`} />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <div className="text-[15px] leading-snug">
          {/* Hủy chứng từ chưa lưu người hủy — câu không có chủ ngữ. */}
          {event.actor ? <span className="font-bold">{event.actor} </span> : null}
          {event.actor ? verb : verb.charAt(0).toUpperCase() + verb.slice(1)}{" "}
          {event.code ? `${object} ` : null}
          {href ? (
            <Link href={href} className={event.code ? "font-mono font-semibold" : "font-semibold"}>
              {target}
            </Link>
          ) : (
            <span className="font-semibold">{target}</span>
          )}
        </div>
        <div className="truncate text-[14px] text-chu-phu" title={event.detail ?? undefined}>
          {activityTime(event.at)}
          {event.detail ? ` · ${event.detail}` : ""}
        </div>
      </div>
    </li>
  );
}

/**
 * Hoạt động gần đây — ai tạo / sửa / xác nhận / ghi sổ / hủy gì, lúc nào (0116); chỉ
 * hôm nay và hôm qua.
 * Lọc theo nhóm; "Xem thêm" lấy tiếp các sự kiện cũ hơn.
 */
export function ActivityFeed() {
  const [group, setGroup] = useState<ActivityGroup>("all");
  const feed = useActivityFeed(group);

  return (
    <section className="flex flex-col gap-1 rounded-[18px] border border-vien bg-nen-the p-5">
      <div className="flex items-center justify-between gap-2 pb-2">
        <span className="flex flex-col">
          <span className="whitespace-nowrap text-[16px] font-extrabold">Hoạt động gần đây</span>
          <span className="text-xs text-chu-phu">Hôm nay và hôm qua</span>
        </span>
        <Select
          size="small"
          className="w-28"
          value={group}
          onChange={setGroup}
          options={ACTIVITY_GROUPS.map((g) => ({ value: g.key, label: g.label }))}
        />
      </div>
      <QueryState
        query={feed}
        isEmpty={(data) => data.pages.every((page) => page.length === 0)}
        emptyDescription="Hôm nay và hôm qua chưa có hoạt động nào."
        skeleton={<Skeleton active paragraph={{ rows: 6 }} />}
      >
        {(data) => (
          <>
            <ul className="m-0 list-none p-0">
              {data.pages.flat().map((event) => (
                <ActivityRow key={event.key} event={event} />
              ))}
            </ul>
            {feed.hasNextPage ? (
              <Button
                size="small"
                type="text"
                className="mt-1 self-start"
                loading={feed.isFetchingNextPage}
                onClick={() => void feed.fetchNextPage()}
              >
                Xem thêm
              </Button>
            ) : null}
          </>
        )}
      </QueryState>
    </section>
  );
}
