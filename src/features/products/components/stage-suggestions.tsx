"use client";

import { App, Collapse, Modal, Table, Tag, Tooltip, Typography } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useMemo, useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { explainError } from "@/shared/lib/errors";
import { removeDiacritics } from "@/shared/lib/text";

import { useApplyStageSuggestions, useStageSuggestions } from "../hooks/useProducts";
import type { StageSuggestion } from "../types";

/**
 * Tên hàng chứa từ của một công đoạn KHÁC công đoạn đang đề xuất → nhiều khả
 * năng đuôi mã nói một đằng, tên nói một nẻo. Không tự loại, chỉ bỏ tick sẵn.
 *
 * Khóa là mã công đoạn trong database.
 */
const STAGE_KEYWORDS: Record<string, string[]> = {
  CARBON: ["carbon", "cb"],
  XI_MA: ["xi ma", "xima", "xi"],
  SON: ["son"],
  NANO: ["nano"],
};

function needsManualCheck(suggestion: StageSuggestion): boolean {
  const name = removeDiacritics(suggestion.name).toLowerCase();

  return Object.entries(STAGE_KEYWORDS).some(
    ([code, keywords]) =>
      code !== suggestion.suggestedStageCode &&
      keywords.some((keyword) => name.includes(keyword)),
  );
}

type Props = { open: boolean; onClose: () => void };

export function StageSuggestions({ open, onClose }: Props) {
  const { message } = App.useApp();
  const suggestions = useStageSuggestions(open);
  const apply = useApplyStageSuggestions();
  const [unchecked, setUnchecked] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const byStage = new Map<string, StageSuggestion[]>();
    for (const suggestion of suggestions.data ?? []) {
      const existing = byStage.get(suggestion.suggestedStageName);
      if (existing) existing.push(suggestion);
      else byStage.set(suggestion.suggestedStageName, [suggestion]);
    }
    return [...byStage.entries()];
  }, [suggestions.data]);

  // Mặc định chọn hết, trừ những mã bị đánh dấu "Kiểm tra".
  const defaultUnchecked = useMemo(
    () =>
      new Set(
        (suggestions.data ?? [])
          .filter(needsManualCheck)
          .map((suggestion) => suggestion.id),
      ),
    [suggestions.data],
  );

  const excluded =
    unchecked.size > 0 || defaultUnchecked.size === 0 ? unchecked : defaultUnchecked;
  const selectedIds = (suggestions.data ?? [])
    .filter((suggestion) => !excluded.has(suggestion.id))
    .map((suggestion) => suggestion.id);

  function toggle(ids: string[], rows: StageSuggestion[]) {
    const next = new Set(excluded);
    for (const row of rows) {
      if (ids.includes(row.id)) next.delete(row.id);
      else next.add(row.id);
    }
    setUnchecked(next);
  }

  async function applySelected() {
    try {
      const count = await apply.mutateAsync(selectedIds);
      message.success(
        count === selectedIds.length
          ? `Đã gán công đoạn cho ${count} mã`
          : `Đã gán công đoạn cho ${count}/${selectedIds.length} mã — số còn lại vừa được người khác sửa.`,
      );
      setUnchecked(new Set());
      onClose();
    } catch (error) {
      const explained = explainError(error);
      message.error(`${explained.title}. ${explained.action}`);
    }
  }

  const columns: ColumnsType<StageSuggestion> = [
    { title: "Mã hàng", dataIndex: "code", width: 170 },
    {
      title: "Tên hàng",
      dataIndex: "name",
      ellipsis: true,
      render: (name: string, row) =>
        needsManualCheck(row) ? (
          <span className="flex items-center gap-2">
            <span className="truncate">{name}</span>
            <Tooltip title="Tên hàng nhắc tới công đoạn khác với đuôi mã — xem kỹ trước khi gán.">
              <Tag color="orange">Kiểm tra</Tag>
            </Tooltip>
          </span>
        ) : (
          name
        ),
    },
    { title: "Nhóm hàng", dataIndex: "categoryName", width: 180, ellipsis: true },
  ];

  return (
    <Modal
      open={open}
      title="Gợi ý công đoạn theo đuôi mã"
      width={900}
      okText={`Áp dụng cho ${selectedIds.length} mã đã chọn`}
      okButtonProps={{ disabled: selectedIds.length === 0, loading: apply.isPending }}
      cancelText="Đóng"
      onOk={() => void applySelected()}
      onCancel={onClose}
    >
      <Typography.Paragraph type="secondary">
        Quy ước đuôi mã đã kiểm trên 1.441 mã: <code>-CB</code> → Carbon (97%),{" "}
        <code>-X</code> → Xi mạ (95%), <code>-S…</code> → Sơn (94%), <code>-N</code> → Nano.
        Bỏ tick những mã bạn thấy sai.
      </Typography.Paragraph>

      <QueryState
        query={suggestions}
        emptyDescription="Không còn mã mua ngoài nào có đuôi -CB / -X / -S / -N."
      >
        {() => (
          <Collapse
            defaultActiveKey={groups.map(([stageName]) => stageName)}
            items={groups.map(([stageName, rows]) => ({
              key: stageName,
              label: `${stageName} · ${rows.length} mã`,
              children: (
                <Table<StageSuggestion>
                  rowKey="id"
                  size="small"
                  columns={columns}
                  dataSource={rows}
                  pagination={false}
                  scroll={{ y: 260 }}
                  rowSelection={{
                    selectedRowKeys: rows
                      .filter((row) => !excluded.has(row.id))
                      .map((row) => row.id),
                    onChange: (keys) => toggle(keys as string[], rows),
                    preserveSelectedRowKeys: true,
                  }}
                />
              ),
            }))}
          />
        )}
      </QueryState>
    </Modal>
  );
}
