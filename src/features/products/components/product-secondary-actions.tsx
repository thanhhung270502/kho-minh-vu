"use client";

import type { ReactNode } from "react";

import type { ProductFilter } from "../schemas/filter.schema";
import { ExcelButton, type ImportKind } from "./excel-button";

type Props = {
  filter: ProductFilter;
  total: number;
  canEdit: boolean;
  onOpenImport?: (kind: ImportKind) => void;
  /** Nút do route ghép vào (vd. "Danh mục phụ" của feature settings). */
  extraActions?: ReactNode;
};

/** Cụm hành động phụ trên thanh công cụ: nút do route ghép vào (Danh mục phụ) + Excel. */
export function ProductSecondaryActions({ filter, total, canEdit, onOpenImport, extraActions }: Props) {
  return (
    <>
      {extraActions}
      <ExcelButton
        filter={filter}
        productCount={total}
        onOpenImport={canEdit ? onOpenImport : undefined}
      />
    </>
  );
}
