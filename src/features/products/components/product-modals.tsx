"use client";

import type { ImportKind } from "./excel-button";
import { ExcelImport } from "./excel-import";
import { NewProductImportDialog } from "./new-product-import/import-dialog";
import { ProductDrawer } from "./product-drawer";

type Props = {
  importOpen: ImportKind | null;
  onCloseImport: () => void;
  onViewRecentlyEdited: () => void;
  drawer: { open: boolean; id: string | null; copyFromId?: string | null };
  onCloseDrawer: () => void;
};

/**
 * Gom các ngăn kéo/modal của trang danh mục — không phải nội dung chính, tách khỏi
 * product-table.tsx cho gọn.
 */
export function ProductModals({
  importOpen,
  onCloseImport,
  onViewRecentlyEdited,
  drawer,
  onCloseDrawer,
}: Props) {
  return (
    <>
      <NewProductImportDialog open={importOpen === "new"} onClose={onCloseImport} />

      <ExcelImport
        open={importOpen === "update"}
        onClose={onCloseImport}
        onViewRecentlyEdited={onViewRecentlyEdited}
      />

      <ProductDrawer
        id={drawer.id}
        copyFromId={drawer.copyFromId ?? null}
        open={drawer.open}
        onClose={onCloseDrawer}
      />
    </>
  );
}
