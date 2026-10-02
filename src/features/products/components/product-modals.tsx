"use client";

import { ExcelImport } from "./excel-import";
import { ProductDrawer } from "./product-drawer";
import { StageSuggestions } from "./stage-suggestions";

type Props = {
  suggestionsOpen: boolean;
  onCloseSuggestions: () => void;
  importOpen: boolean;
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

      <ExcelImport
        open={importOpen}
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
