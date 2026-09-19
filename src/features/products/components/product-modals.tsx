"use client";

import type { CatalogPermissions } from "../types";
import { CostImport } from "./cost-import";
import { ExcelImport } from "./excel-import";
import { ProductDrawer } from "./product-drawer";
import { StageSuggestions } from "./stage-suggestions";

type Props = {
  permissions: CatalogPermissions;
  suggestionsOpen: boolean;
  onCloseSuggestions: () => void;
  importOpen: boolean;
  onCloseImport: () => void;
  onViewRecentlyEdited: () => void;
  drawer: { open: boolean; id: string | null };
  onCloseDrawer: () => void;
  costImportOpen: boolean;
  onCloseCostImport: () => void;
};

/**
 * Gom 3 ngăn kéo/modal của trang danh mục — không phải nội dung chính, tách khỏi
 * product-table.tsx cho gọn.
 */
export function ProductModals({
  permissions,
  suggestionsOpen,
  onCloseSuggestions,
  importOpen,
  onCloseImport,
  onViewRecentlyEdited,
  drawer,
  onCloseDrawer,
  costImportOpen,
  onCloseCostImport,
}: Props) {
  return (
    <>
      <CostImport open={costImportOpen} onClose={onCloseCostImport} />
      <StageSuggestions open={suggestionsOpen} onClose={onCloseSuggestions} />

      <ExcelImport
        open={importOpen}
        onClose={onCloseImport}
        onViewRecentlyEdited={onViewRecentlyEdited}
      />

      <ProductDrawer
        id={drawer.id}
        open={drawer.open}
        permissions={permissions}
        onClose={onCloseDrawer}
      />
    </>
  );
}
