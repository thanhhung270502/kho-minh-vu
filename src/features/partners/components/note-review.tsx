"use client";

import {
  Alert,
  Button,
  Input,
  Popconfirm,
  Progress,
  Result,
  Table,
  Tabs,
  Tag,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

import { QueryState } from "@/shared/components/query-state";

import {
  DEFAULT_NOTE_FILTER,
  type NoteFilter,
  type NoteRow,
} from "../api/note-review.api";
import { useNoteCounts, useNotes, useUndoNoteDecision } from "../hooks/useNoteReview";
import { NoteActions } from "./note-actions";

const TIP_DISMISSED_KEY = "kho-minh-vu:meo-ra-ghi-chu";

/**
 * Mẹo đầu màn nhớ trạng thái "đã đóng" trong localStorage.
 *
 * Đọc bằng `useSyncExternalStore` chứ không `useEffect` + `setState`: localStorage
 * không có ở lượt render trên server, và đây đúng là "nguồn dữ liệu ngoài React".
 * Ảnh chụp phía server trả `true` (coi như đã đóng) nên HTML server không hiện
 * mẹo — không lệch hydrate, React tự vẽ lại sau khi hydrate xong.
 */
let tipListeners: Array<() => void> = [];

function subscribeTip(callback: () => void) {
  tipListeners.push(callback);
  return () => {
    tipListeners = tipListeners.filter((listener) => listener !== callback);
  };
}

function readTipDismissed(): boolean {
  try {
    return localStorage.getItem(TIP_DISMISSED_KEY) === "1";
  } catch {
    // Chế độ riêng tư hoặc bị chặn site data — cứ hiện mẹo.
    return false;
  }
}

function dismissTip() {
  try {
    localStorage.setItem(TIP_DISMISSED_KEY, "1");
  } catch {
    /* không ghi được thì lần sau hiện lại, chấp nhận */
  }
  tipListeners.forEach((listener) => listener());
}

/** Khóa là giá trị `loai` của RPC quyet_ghi_chu. */
const DECISION_LABELS: Record<string, string> = {
  KHACH: "Khách",
  SALE: "Sale",
  KHACH_VA_SALE: "Khách + sale",
  BO_QUA: "Bỏ qua",
};

function shortDate(iso: string | null): string {
  if (!iso) return "";
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")}/${String(
    date.getMonth() + 1,
  ).padStart(2, "0")}`;
}

export function NoteReview() {
  const counts = useNoteCounts();
  const undoDecision = useUndoNoteDecision();
  const [filter, setFilter] = useState<NoteFilter>(DEFAULT_NOTE_FILTER);
  const notes = useNotes(filter);

  const tipDismissed = useSyncExternalStore(subscribeTip, readTipDismissed, () => true);

  const rows = notes.data?.rows ?? [];
  const total = notes.data?.total ?? 0;

  // Quyết nốt phần tử cuối của trang 3 thì trang 3 biến mất — về trang 1 ngay
  // trong lúc render, không qua effect (xem SUMMARY plan 13).
  if (!notes.isPending && !notes.isFetching && filter.page > 1 && rows.length === 0) {
    setFilter({ ...filter, page: 1 });
  }

  const showingReviewed = filter.status === "da_ra";
  const reviewedCount = (counts.data?.total ?? 0) - (counts.data?.pending ?? 0);
  const percent = counts.data?.total
    ? Math.round((reviewedCount / counts.data.total) * 100)
    : 0;

  const columns: ColumnsType<NoteRow> = [
    {
      title: "Giá trị ghi chú",
      dataIndex: "value",
      render: (value: string) => (
        <Typography.Paragraph
          className="mb-0 whitespace-pre-line"
          ellipsis={{ rows: 3, expandable: true, symbol: "xem thêm" }}
        >
          {value}
        </Typography.Paragraph>
      ),
    },
    {
      title: "Hóa đơn",
      dataIndex: "invoiceCount",
      width: 90,
      align: "right",
      render: (count: number) => (
        <strong>{Number(count).toLocaleString("vi-VN")}</strong>
      ),
    },
    {
      title: "Khoảng ngày",
      key: "dateRange",
      width: 130,
      render: (_, row) => `${shortDate(row.firstDate)} → ${shortDate(row.lastDate)}`,
    },
    {
      title: "Hóa đơn mẫu",
      dataIndex: "sampleInvoices",
      width: 200,
      render: (invoices: string[] | null) => (
        <span className="flex flex-wrap gap-1">
          {(invoices ?? []).slice(0, 3).map((invoice) => (
            <Tag key={invoice} className="m-0">
              {invoice}
            </Tag>
          ))}
        </span>
      ),
    },
    ...(showingReviewed
      ? [
          {
            title: "Quyết định",
            key: "decision",
            width: 220,
            render: (_: unknown, row: NoteRow) => (
              <span className="flex flex-wrap items-center gap-1">
                <Tag color={row.kind === "BO_QUA" ? undefined : "blue"}>
                  {DECISION_LABELS[row.kind] ?? row.kind}
                </Tag>
                {row.partnerId ? (
                  <Link href={`/doi-tac/${row.partnerId}`}>{row.partnerName}</Link>
                ) : null}
                {row.salesName ? (
                  <span className="text-gray-500">Sale: {row.salesName}</span>
                ) : null}
              </span>
            ),
          },
          {
            title: "",
            key: "undo",
            width: 130,
            align: "right" as const,
            render: (_: unknown, row: NoteRow) => (
              <Popconfirm
                title="Hủy quyết định này?"
                description="Giá trị quay lại danh sách chưa rà. Khách đã tạo KHÔNG bị xóa."
                okText="Hủy quyết định"
                cancelText="Thôi"
                onConfirm={() => void undoDecision.mutateAsync(row.value)}
              >
                <Button type="link" size="small" className="px-0" danger>
                  Hủy quyết định
                </Button>
              </Popconfirm>
            ),
          },
        ]
      : [
          {
            title: "",
            key: "actions",
            width: 340,
            align: "right" as const,
            render: (_: unknown, row: NoteRow) => (
              <NoteActions key={row.value} row={row} />
            ),
          },
        ]),
  ];

  if (counts.data && counts.data.pending === 0 && !showingReviewed) {
    return (
      <Result
        status="success"
        title="Đã rà xong mọi giá trị ghi chú"
        subTitle={`${counts.data.total} giá trị đã có quyết định.`}
        extra={[
          <Link key="customers" href="/doi-tac?loai=KHACH">
            <Button type="primary">Xem danh sách khách hàng</Button>
          </Link>,
          <Button
            key="review"
            onClick={() => setFilter({ ...DEFAULT_NOTE_FILTER, status: "da_ra" })}
          >
            Xem lại các quyết định
          </Button>,
        ]}
      />
    );
  }

  return (
    <>
      <div className="mb-3">
        <Progress
          percent={percent}
          status={percent === 100 ? "success" : "active"}
          format={() => `${reviewedCount}/${counts.data?.total ?? 0}`}
        />
        <Typography.Text type="secondary">
          Còn <strong>{counts.data?.pending ?? 0}</strong> giá trị chưa rà trên tổng{" "}
          {counts.data?.total ?? 0}.
        </Typography.Text>
      </div>

      {tipDismissed ? null : (
        <Alert
          className="mb-3"
          type="info"
          showIcon
          closable
          onClose={dismissTip}
          title="Hóa đơn không ghi tên đã tự gắn vào Khách lẻ. Tên ngắn như NGỌC, TỐT… có thể là khách hoặc người bán — hỏi người biết chuyện nếu chưa chắc, cứ để lại chưa rà."
        />
      )}

      <Tabs
        activeKey={filter.status}
        onChange={(key) =>
          setFilter({ ...DEFAULT_NOTE_FILTER, status: key as NoteFilter["status"] })
        }
        items={[
          { key: "chua_ra", label: `Chưa rà (${counts.data?.pending ?? 0})` },
          { key: "da_ra", label: `Đã rà (${reviewedCount})` },
        ]}
      />

      <Input.Search
        allowClear
        className="mb-3 w-full sm:max-w-md"
        placeholder="Tìm trong giá trị ghi chú"
        defaultValue={filter.q}
        onSearch={(value) =>
          setFilter((current) => ({ ...current, q: value.trim(), page: 1 }))
        }
      />

      <QueryState
        query={notes}
        isEmpty={(page) => page.rows.length === 0}
        emptyDescription={
          filter.q
            ? `Không có giá trị nào khớp “${filter.q}”.`
            : showingReviewed
              ? "Chưa quyết giá trị nào."
              : "Không còn giá trị nào chưa rà."
        }
      >
        {(page) => (
          <div className="overflow-x-auto">
            <Table<NoteRow>
              rowKey="value"
              size="small"
              columns={columns}
              dataSource={page.rows}
              loading={notes.isFetching && !notes.isPending}
              scroll={{ x: 1000 }}
              pagination={{
                current: filter.page,
                pageSize: 30,
                total,
                showSizeChanger: false,
                showTotal: (count) => `${count} giá trị`,
                onChange: (nextPage) =>
                  setFilter((current) => ({ ...current, page: nextPage })),
              }}
            />
          </div>
        )}
      </QueryState>
    </>
  );
}
