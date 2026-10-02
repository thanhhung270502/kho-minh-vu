"use client";

import type { ImportKind } from "./excel-button";
import { ExcelImport } from "./excel-import";
import { NewProductImportDialog } from "./new-product-import/import-dialog";
import { ProductDrawer } from "./product-drawer";
import { StageSuggestions } from "./stage-suggestions";

type Props = {
  suggestionsOpen: boolean;
  onCloseSuggestions: () => void;
  importOpen: ImportKind | null;
  onCloseImport: () => void;
  onViewRecentlyEdited: () => void;
  drawer: { open: boolean; id: string | null };
  onCloseDrawer: () => void;
};

/**
 * Gom 3 ngăn kéo/modal của trang danh mục — không phải nội dung chính, tách khỏi
 * product-table.tsx cho gọn.
 */
export function ProductModals({
  suggestionsOpen,
  onCloseSuggestions,
  importOpen,
  onCloseImport,
  onViewRecentlyEdited,
  drawer,
  onCloseDrawer,
}: Props) {
  return (
    <>
      <StageSuggestions open={suggestionsOpen} onClose={onCloseSuggestions} />

      <NewProductImportDialog open={importOpen === "new"} onClose={onCloseImport} />

      <ExcelImport
        open={importOpen === "update"}
        onClose={onCloseImport}
        onViewRecentlyEdited={onViewRecentlyEdited}
      />

      <ProductDrawer
        id={drawer.id}
        open={drawer.open}
        onClose={onCloseDrawer}
      />
    </>
  );
}
