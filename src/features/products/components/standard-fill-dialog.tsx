"use client";

import { Alert, Button, Modal, Progress, Statistic } from "antd";
import { useMemo, useState } from "react";

import { useCodeDictionary } from "@/features/product-codes/hooks/useCodeDictionary";
import { QueryState } from "@/shared/components/query-state";
import { buildCsv, downloadBlob } from "@/shared/lib/csv";
import { explainError } from "@/shared/lib/errors";

import { useLookups } from "../hooks/useProducts";
import { useFillStandardFields, useStandardFillSources } from "../hooks/useStandardFill";
import { planStandardFill, type StandardFillPlan } from "../lib/standard-fill";
import { STANDARD_FIELD_LABELS, type StandardFieldKey } from "../lib/standard-fields";
import { CodeDictionaryError } from "./code-dictionary-error";

type Props = { open: boolean; onClose: () => void };

const nf = (n: number) => n.toLocaleString("vi-VN");

/**
 * "Điền quy chuẩn từ mã" (quy chuẩn mã, phần A) — tách lại MỌI mã bằng bộ mã
 * hóa, xem trước số ô sẽ điền, rồi gửi RPC dien_quy_chuan theo lô. Chỉ lấp ô
 * trống; ô đã có giá trị và ô chọn tay giữ nguyên.
 */
export function StandardFillDialog({ open, onClose }: Props) {
  const lookups = useLookups();
  const dict = useCodeDictionary();
  const { dictionary, entries, isPending: dictPending } = dict;
  const sources = useStandardFillSources(lookups.data?.stages, open);
  const fill = useFillStandardFields();
  const [done, setDone] = useState(0);
  const [changedCount, setChangedCount] = useState<number | null>(null);

  const plan = useMemo(() => {
    if (!sources.data || entries.length === 0) return null;
    const known = new Set(
      (lookups.data?.stages ?? []).flatMap((s) => (s.standardCode ? [s.standardCode.toUpperCase()] : [])),
    );
    return planStandardFill(sources.data, dictionary, known);
  }, [sources.data, entries.length, dictionary, lookups.data?.stages]);

  const running = fill.isPending;

  function close() {
    if (running) return;
    fill.reset();
    setDone(0);
    setChangedCount(null);
    onClose();
  }

  function apply(current: StandardFillPlan) {
    setDone(0);
    setChangedCount(null);
    fill.mutate(
      { changes: current.changes, onProgress: setDone },
      { onSuccess: (count) => setChangedCount(count) },
    );
  }

  return (
    <Modal
      open={open}
      title="Điền quy chuẩn từ mã"
      width={560}
      onCancel={close}
      closable={!running}
      mask={{ closable: !running }}
      footer={
        plan ? (
          <div className="flex flex-wrap justify-end gap-2">
            <Button disabled={running} onClick={close}>
              Đóng
            </Button>
            <Button
              type="primary"
              loading={running}
              disabled={plan.changes.length === 0}
              onClick={() => apply(plan)}
            >
              {plan.changes.length === 0 ? "Không có ô nào để điền" : `Điền ${nf(plan.changes.length)} mã`}
            </Button>
          </div>
        ) : null
      }
    >
      {dict.isError ? (
        <CodeDictionaryError error={dict.error} retrying={dict.isFetching} onRetry={() => void dict.refetch()} />
      ) : dictPending ? null : entries.length === 0 ? (
        <Alert
          type="warning"
          showIcon
          title="Chưa có bộ mã hóa"
          description="Bộ mã hóa đồng bộ từ sheet Quy chuẩn mã mỗi ngày. Chờ lần đồng bộ đầu tiên rồi thử lại, hoặc báo quản trị kiểm tra job đồng bộ."
        />
      ) : (
        <QueryState query={sources} emptyDescription="Danh mục chưa có mã hàng nào.">
          {() => (plan ? <PlanSummary plan={plan} /> : null)}
        </QueryState>
      )}

      {running && plan ? (
        <Progress className="mt-4" percent={Math.round((done / Math.max(plan.changes.length, 1)) * 100)} />
      ) : null}

      {fill.isError ? (
        <Alert
          className="mt-4"
          type="error"
          showIcon
          title={explainError(fill.error).title}
          description={`Đã ghi ${nf(done)} mã trước khi lỗi. ${explainError(fill.error).action} Bấm điền lại an toàn — chỉ ô còn trống mới được điền.`}
        />
      ) : null}

      {changedCount !== null ? (
        <Alert
          className="mt-4"
          type="success"
          showIcon
          title={`Đã điền quy chuẩn cho ${nf(changedCount)} mã`}
          description="Ghi chú tự sinh của từng mã đã cập nhật theo. Lọc “Thiếu quy chuẩn” để xem mã còn thiếu."
        />
      ) : null}
    </Modal>
  );
}

function PlanSummary({ plan }: { plan: StandardFillPlan }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-3 gap-3">
        <Statistic title="Tổng số mã" value={plan.total} formatter={(v) => nf(Number(v))} />
        <Statistic title="Đúng quy chuẩn" value={plan.validCount} formatter={(v) => nf(Number(v))} />
        <Statistic title="Sai quy chuẩn" value={plan.invalid.length} formatter={(v) => nf(Number(v))} />
      </div>

      <div>
        <div className="mb-1 text-sm font-medium">Sẽ điền vào ô đang trống</div>
        <ul className="m-0 list-none p-0 text-sm">
          {(Object.keys(STANDARD_FIELD_LABELS) as StandardFieldKey[]).map((key) => (
            <li key={key} className="flex justify-between border-b border-gray-100 py-1">
              <span>{STANDARD_FIELD_LABELS[key]}</span>
              <span className="tabular-nums">{nf(plan.fieldCounts[key])} ô</span>
            </li>
          ))}
        </ul>
        <div className="mt-2 text-xs text-chu-phu">
          Ô đã có giá trị và ô đánh dấu “Chọn tay” giữ nguyên. Mã sai chuẩn vẫn được điền những
          phần tách được.
        </div>
      </div>

      {plan.invalid.length > 0 ? (
        <Button
          className="self-start"
          onClick={() =>
            downloadBlob(
              buildCsv(
                ["Mã hàng", "Tên hàng", "Lý do"],
                plan.invalid.map((i) => [i.code, i.name, i.reason]),
              ),
              "ma-sai-quy-chuan.csv",
            )
          }
        >
          Tải danh sách {nf(plan.invalid.length)} mã sai chuẩn (CSV)
        </Button>
      ) : null}
    </div>
  );
}
