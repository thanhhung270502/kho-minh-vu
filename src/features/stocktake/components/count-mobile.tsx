"use client";

import type { RefSelectProps } from "antd/es/select";
import { App, Button, Card, InputNumber, Tag, Typography } from "antd";
import { useRef, useState, type ComponentRef } from "react";

import {
  ProductSearchInput,
  type ProductSearchResult,
} from "@/shared/components/product-search-input";
import { errorCode, explainError, isPostgrestError } from "@/shared/lib/errors";

import { useCountSheet, useSaveCount } from "../hooks/useStocktake";
import { countQuantitySchema } from "../schemas/stocktake.schema";

type Props = { sessionId: string; editable: boolean };

/**
 * Màn đếm điện thoại (KKE-02): gõ mã → Enter (bắt bên trong `ProductSearchInput`,
 * bẫy 14a) → ô số → Enter → lưu → con trỏ quay về ô mã (bẫy 14b). Đếm mù — KHÔNG
 * hiện tồn sổ/tồn hiện tại/tồn KiotViet (D-08). Chỉ gõ mã bằng bàn phím —
 * không dùng camera đọc mã (KKE-02 chốt 24/09).
 */
export function CountMobile({ sessionId, editable }: Props) {
  const { message } = App.useApp();
  const sheet = useCountSheet(sessionId);
  const saveCount = useSaveCount(sessionId);

  const [selected, setSelected] = useState<ProductSearchResult | null>(null);
  const [quantity, setQuantity] = useState<number | null>(null);
  const [quantityError, setQuantityError] = useState<string | null>(null);

  const codeRef = useRef<RefSelectProps>(null);
  const quantityRef = useRef<ComponentRef<typeof InputNumber>>(null);

  const rows = sheet.data ?? [];
  const total = rows.length;
  const countedCount = rows.filter((row) => row.lineId !== null).length;

  const existingLine = selected
    ? (rows.find((row) => row.productId === selected.id) ?? null)
    : null;

  function selectProduct(product: ProductSearchResult) {
    setSelected(product);
    setQuantity(null);
    setQuantityError(null);
    // Ô số chỉ được render sau lượt này, và rc-select còn tự focus lại ô tìm
    // ngay sau Enter (bẫy 14) — hẹn sang lượt sau mới focus được.
    setTimeout(() => quantityRef.current?.focus(), 0);
  }

  async function save() {
    if (!selected || saveCount.isPending) return;

    const parsed = countQuantitySchema.safeParse(quantity);
    if (!parsed.success) {
      setQuantityError(parsed.error.issues[0]?.message ?? "Nhập số đếm");
      return;
    }
    setQuantityError(null);

    try {
      await saveCount.mutateAsync({ productId: selected.id, quantity: parsed.data });
      message.success(`Đã lưu ${selected.code}: ${parsed.data}`);
      setSelected(null);
      setQuantity(null);
      // Hẹn sang lượt sau: focus ngay lúc này bị vòng render dọn đi (bẫy 14b).
      setTimeout(() => codeRef.current?.focus(), 0);
    } catch (caught) {
      if (errorCode(caught) === "23514") {
        setQuantityError(
          isPostgrestError(caught) ? caught.message : "Số đếm không hợp lệ.",
        );
        return;
      }
      if (errorCode(caught) === "42501") {
        setQuantityError("Bạn không được đếm phiên này.");
        return;
      }
      const explained = explainError(caught);
      setQuantityError(`${explained.title}. ${explained.action}`);
    }
  }

  const disabled = !editable || saveCount.isPending;

  return (
    <div className="mx-auto flex w-full max-w-md flex-col gap-3">
      <div className="flex items-center justify-between">
        <Typography.Text type="secondary">
          Đã đếm {countedCount}/{total}
        </Typography.Text>
      </div>

      <ProductSearchInput
        inputRef={codeRef}
        disabled={disabled}
        onSelect={selectProduct}
      />

      {selected ? (
        <Card size="small">
          <div className="flex flex-col gap-1">
            <span className="font-mono text-lg font-bold">{selected.code}</span>
            <span>{selected.name}</span>
            {existingLine?.unitName ? (
              <Typography.Text type="secondary">
                ĐVT: {existingLine.unitName}
              </Typography.Text>
            ) : null}
            {existingLine?.needsRecount ? (
              <Tag color="red" className="w-fit">
                Cần đếm lại
              </Tag>
            ) : null}
            {existingLine && existingLine.counted !== null ? (
              <Typography.Text type="warning">
                Đã đếm {existingLine.counted}
                {existingLine.countedAt
                  ? ` lúc ${new Date(existingLine.countedAt).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}{" "}
                — lưu sẽ ghi đè và chốt lại tồn sổ lúc lưu.
              </Typography.Text>
            ) : null}
          </div>

          <InputNumber
            ref={quantityRef}
            size="large"
            className="mt-3 w-full"
            min={0}
            inputMode="decimal"
            value={quantity}
            disabled={disabled}
            status={quantityError ? "error" : undefined}
            onChange={(value) => {
              setQuantity(value);
              setQuantityError(null);
            }}
            onPressEnter={(event) => {
              event.preventDefault();
              void save();
            }}
          />
          {quantityError ? (
            <Typography.Text type="danger" className="mt-1 block">
              {quantityError}
            </Typography.Text>
          ) : null}

          <Button
            type="primary"
            size="large"
            block
            className="mt-3 h-12"
            loading={saveCount.isPending}
            disabled={disabled}
            onClick={() => void save()}
          >
            Lưu
          </Button>
        </Card>
      ) : null}
    </div>
  );
}
