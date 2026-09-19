"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Alert, App, Button, Input, InputNumber, Table } from "antd";
import type { ColumnsType } from "antd/es/table";
import { useState } from "react";

import { QueryState } from "@/shared/components/query-state";
import { explainError, isPostgrestError } from "@/shared/lib/errors";

import {
  docNumberingLabel,
  fetchDocNumbering,
  nextDocNoExample,
  saveDocNumbering,
  type DocNumberingRow,
  type DocType,
} from "../api/doc-numbering.api";

const VALID_PREFIX = /^[A-Z0-9]{1,5}$/;

type Draft = { prefix: string; digits: number };

const QUERY_KEY = ["doc-numbering"] as const;

export function DocNumberingSettings() {
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const rows = useQuery({ queryKey: QUERY_KEY, queryFn: fetchDocNumbering });

  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [savingKey, setSavingKey] = useState<string | null>(null);

  const save = useMutation({
    mutationFn: (input: { docType: DocType; source: string; values: Draft }) =>
      saveDocNumbering(input.docType, input.source, input.values),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: QUERY_KEY }),
  });

  /** Một loại giờ có thể có nhiều dòng (NHAP có thêm dòng nhà máy). */
  function rowKey(row: DocNumberingRow): string {
    return `${row.docType}|${row.source}`;
  }

  function draftOf(row: DocNumberingRow): Draft {
    return drafts[rowKey(row)] ?? { prefix: row.prefix, digits: row.digits };
  }

  function change(row: DocNumberingRow, patch: Partial<Draft>) {
    setDrafts((current) => ({
      ...current,
      [rowKey(row)]: { ...draftOf(row), ...patch },
    }));
    setErrors((current) => ({ ...current, [rowKey(row)]: "" }));
  }

  function isDirty(row: DocNumberingRow): boolean {
    const draft = draftOf(row);
    return draft.prefix !== row.prefix || draft.digits !== row.digits;
  }

  function validate(row: DocNumberingRow, allRows: DocNumberingRow[]): string | null {
    const draft = draftOf(row);
    if (!VALID_PREFIX.test(draft.prefix)) {
      return "Tiền tố 1–5 ký tự, chỉ chữ in hoa không dấu và số.";
    }
    const duplicate = allRows.find(
      (other) => rowKey(other) !== rowKey(row) && draftOf(other).prefix === draft.prefix,
    );
    if (duplicate) {
      return `Tiền tố đã dùng cho ${docNumberingLabel(duplicate.docType, duplicate.source)}.`;
    }

    const issuedDigits = String(row.current).length;
    if (draft.digits < issuedDigits) {
      return `Đã phát tới số ${row.current} — cần ít nhất ${issuedDigits} chữ số.`;
    }
    return null;
  }

  async function saveRow(row: DocNumberingRow, allRows: DocNumberingRow[]) {
    const validationError = validate(row, allRows);
    if (validationError) {
      setErrors((current) => ({ ...current, [rowKey(row)]: validationError }));
      return;
    }

    setSavingKey(rowKey(row));
    try {
      await save.mutateAsync({
        docType: row.docType,
        source: row.source,
        values: draftOf(row),
      });
      setDrafts((current) => {
        const rest = { ...current };
        delete rest[rowKey(row)];
        return rest;
      });
      message.success(
        `Đã lưu quy tắc số ${docNumberingLabel(row.docType, row.source)}`,
      );
    } catch (error) {
      if (isPostgrestError(error) && (error.code === "23505" || error.code === "23514")) {
        setErrors((current) => ({
          ...current,
          [rowKey(row)]:
            error.code === "23505"
              ? "Tiền tố đã dùng cho loại khác."
              : error.message,
        }));
        return;
      }
      const explained = explainError(error);
      setErrors((current) => ({
        ...current,
        [rowKey(row)]: `${explained.title}. ${explained.action}`,
      }));
    } finally {
      setSavingKey(null);
    }
  }

  function buildColumns(allRows: DocNumberingRow[]): ColumnsType<DocNumberingRow> {
    return [
      {
        title: "Loại chứng từ",
        dataIndex: "docType",
        width: 160,
        render: (_: DocType, row) => docNumberingLabel(row.docType, row.source),
      },
      {
        title: "Tiền tố",
        key: "prefix",
        width: 200,
        render: (_, row) => (
          <div>
            <Input
              value={draftOf(row).prefix}
              maxLength={5}
              status={errors[rowKey(row)] ? "error" : undefined}
              onChange={(event) =>
                change(row, { prefix: event.target.value.toUpperCase() })
              }
            />
            {errors[rowKey(row)] ? (
              <div className="mt-1 text-xs text-red-600">{errors[rowKey(row)]}</div>
            ) : null}
          </div>
        ),
      },
      {
        title: "Số chữ số",
        key: "digits",
        width: 120,
        render: (_, row) => (
          <InputNumber
            min={3}
            max={8}
            value={draftOf(row).digits}
            onChange={(value) => change(row, { digits: value ?? draftOf(row).digits })}
          />
        ),
      },
      { title: "Đã phát năm nay", dataIndex: "current", width: 130 },
      {
        title: "Số kế tiếp",
        key: "example",
        width: 170,
        render: (_, row) => (
          <code>
            {nextDocNoExample(draftOf(row).prefix, draftOf(row).digits, row.current)}
          </code>
        ),
      },
      {
        title: "",
        key: "save",
        width: 90,
        align: "right",
        render: (_, row) => (
          <Button
            type="link"
            size="small"
            className="px-0"
            disabled={!isDirty(row)}
            loading={savingKey === rowKey(row)}
            onClick={() => void saveRow(row, allRows)}
          >
            Lưu
          </Button>
        ),
      },
    ];
  }

  return (
    <>
      <Alert
        className="mb-3"
        type="info"
        showIcon
        title="Đổi tiền tố chỉ áp cho chứng từ tạo sau. Số đã phát giữ nguyên. Số thứ tự tự đặt lại về 1 vào đầu năm."
      />

      <QueryState query={rows} emptyDescription="Chưa có cấu hình đánh số nào.">
        {(loadedRows) => (
          <div className="overflow-x-auto">
            <Table<DocNumberingRow>
              rowKey={rowKey}
              size="small"
              columns={buildColumns(loadedRows)}
              dataSource={loadedRows}
              pagination={false}
              scroll={{ x: 900 }}
            />
          </div>
        )}
      </QueryState>
    </>
  );
}
